import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { init, requestDeviceIdentifier } from "@nimiq/mini-app-sdk";

interface NimiqContextType {
  isReady: boolean;
  playerId: string | null;
  walletAddress: `0x${string}` | null;
  connectWallet: () => Promise<void>;
  error: string | null;
}

const NimiqContext = createContext<NimiqContextType>({
  isReady: false,
  playerId: null,
  walletAddress: null,
  connectWallet: async () => { },
  error: null,
});

export function NimiqProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeSdk() {
      try {
        console.log("NimiqSDK: Initializing Nimiq Mini App SDK...");
        // 1. Wait for provider to be ready (fast 300ms check for web previews)
        try {
          await Promise.race([
            init(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("SDK init timeout")), 300))
          ]);
          console.log("NimiqSDK: SDK initialized successfully.");
        } catch (sdkErr) {
          console.warn("NimiqSDK: Running outside Nimiq Pay WebView. Bypassing SDK init.", sdkErr);
        }

        // 2. Request device identifier (fast 300ms fallback)
        try {
          const id = await Promise.race([
            requestDeviceIdentifier({ reason: "Player identity" }),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Device ID timeout")), 300))
          ]);
          console.log("NimiqSDK: Retrieved player ID:", id);
          setPlayerId(id);
        } catch (idErr) {
          console.warn("NimiqSDK: Failed to get device identifier:", idErr);
          setPlayerId("mock-player-id-123");
        }

        // 3. Fetch connected EVM address immediately from injected window.ethereum
        if (window.ethereum) {
          console.log("NimiqSDK: Injected window.ethereum found.");

          // Request accounts. No connect dialog is needed, but we request the connected address.
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          }) as string[];

          if (accounts && accounts.length > 0) {
            const address = accounts[0] as `0x${string}`;
            console.log("NimiqSDK: Wallet account retrieved:", address);
            setWalletAddress(address);
          } else {
            // If eth_accounts returns empty (unlikely inside Nimiq Pay), request permission
            console.log("NimiqSDK: No active accounts found. Requesting accounts...");
            const requestedAccounts = await window.ethereum.request({
              method: "eth_requestAccounts",
            }) as string[];
            if (requestedAccounts && requestedAccounts.length > 0) {
              setWalletAddress(requestedAccounts[0] as `0x${string}`);
            }
          }

          // Listen for account changes
          window.ethereum.on("accountsChanged", (newAccounts: unknown) => {
            const accs = newAccounts as string[];
            if (accs && accs.length > 0) {
              setWalletAddress(accs[0] as `0x${string}`);
            } else {
              setWalletAddress(null);
            }
          });
        } else {
          console.warn("NimiqSDK: window.ethereum not found. In mock/browser environment.");
          // Fallback placeholder address for development/browser preview outside Nimiq Pay
          const mockAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;
          setWalletAddress(mockAddress);
        }

        setIsReady(true);
      } catch (err: any) {
        console.error("NimiqSDK: Initialization failed:", err);
        setError(err.message || "Failed to initialize Nimiq Pay SDK");
        setIsReady(true); // set ready to render error screen
      }
    }

    initializeSdk();
  }, []);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        setError(null);
        console.log("NimiqSDK: Requesting eth_requestAccounts from window.ethereum...");
        const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
        if (accounts && accounts.length > 0) {
          const addr = accounts[0] as `0x${string}`;
          setWalletAddress(addr);
          console.log("NimiqSDK: Connected address:", addr);
        }
      } catch (err: any) {
        console.error("useNimiq: Connect wallet failed:", err);
        setError(err.message || "Failed to connect wallet");
        alert(`Wallet Connection Error: ${err.message || "User rejected connection request"}`);
      }
    } else {
      console.warn("NimiqSDK: window.ethereum not found.");
      alert(
        "⚡ Nimiq Pay / Web3 Wallet Required\n\n" +
        "• Playing in Nimiq Pay: Open this app inside the Nimiq Pay Mini App tab.\n" +
        "• Playing in Browser: Please install MetaMask or a Web3 wallet extension to connect on Base."
      );
    }
  };

  return (
    <NimiqContext.Provider value={{ isReady, playerId, walletAddress, connectWallet, error }}>
      {children}
    </NimiqContext.Provider>
  );
}

export function useNimiq() {
  return useContext(NimiqContext);
}
