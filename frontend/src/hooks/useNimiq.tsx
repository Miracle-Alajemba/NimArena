import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { init, requestDeviceIdentifier } from "@nimiq/mini-app-sdk";

interface NimiqContextType {
  isReady: boolean;
  playerId: string | null;
  walletAddress: `0x${string}` | null;
  error: string | null;
}

const NimiqContext = createContext<NimiqContextType>({
  isReady: false,
  playerId: null,
  walletAddress: null,
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
        // 1. Wait for provider to be ready (catch error to allow normal web previews)
        try {
          await init();
          console.log("NimiqSDK: SDK initialized successfully.");
        } catch (sdkErr) {
          console.warn("NimiqSDK: Running outside Nimiq Pay WebView. Bypassing SDK init.", sdkErr);
        }

        // 2. Request device identifier (persistent across sessions)
        try {
          const id = await requestDeviceIdentifier({ reason: "Player identity" });
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

  return (
    <NimiqContext.Provider value={{ isReady, playerId, walletAddress, error }}>
      {children}
    </NimiqContext.Provider>
  );
}

export function useNimiq() {
  return useContext(NimiqContext);
}
