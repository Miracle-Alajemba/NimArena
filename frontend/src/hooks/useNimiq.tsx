import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import {
  connectWallet as walletConnect,
  disconnectWallet as walletDisconnect,
  getBalance as fetchBalances,
  loadStoredWallet,
  saveStoredWallet,
} from "../nimiq/wallet";
import { parseWalletError } from "../nimiq/errors";

interface NimiqContextType {
  isReady: boolean;
  isConnected: boolean;
  playerId: string | null;
  walletAddress: `0x${string}` | null;
  nimBalance: string;
  usdtBalance: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
  error: string | null;
}

const NimiqContext = createContext<NimiqContextType>({
  isReady: false,
  isConnected: false,
  playerId: null,
  walletAddress: null,
  nimBalance: "0.00",
  usdtBalance: "0.00",
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshBalances: async () => {},
  error: null,
});

export function NimiqProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [nimBalance, setNimBalance] = useState("250.00");
  const [usdtBalance, setUsdtBalance] = useState("45.50");
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = useCallback(async () => {
    if (walletAddress) {
      const b = await fetchBalances(walletAddress);
      setNimBalance(b.nim);
      setUsdtBalance(b.usdt);
    }
  }, [walletAddress]);

  useEffect(() => {
    async function initWalletState() {
      try {
        const stored = loadStoredWallet();
        if (stored.address && stored.isConnected) {
          setWalletAddress(stored.address as `0x${string}`);
          setPlayerId(stored.deviceId || "dev-player-1");
          setIsConnected(true);
        } else {
          // Default demo connection
          const mockAddr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;
          setWalletAddress(mockAddr);
          setPlayerId("dev-player-1");
          setIsConnected(true);
        }

        setIsReady(true);
      } catch (err: any) {
        console.error("NimiqProvider: Init failed", err);
        setError(parseWalletError(err));
        setIsReady(true);
      }
    }

    initWalletState();
  }, []);

  const handleConnect = async () => {
    try {
      setError(null);
      const res = await walletConnect();
      setWalletAddress(res.address);
      setPlayerId(res.deviceId);
      setIsConnected(true);
      refreshBalances();
    } catch (err: any) {
      setError(parseWalletError(err));
    }
  };

  const handleDisconnect = () => {
    walletDisconnect();
    setIsConnected(false);
    setWalletAddress(null);
  };

  return (
    <NimiqContext.Provider
      value={{
        isReady,
        isConnected,
        playerId,
        walletAddress,
        nimBalance,
        usdtBalance,
        connectWallet: handleConnect,
        disconnectWallet: handleDisconnect,
        refreshBalances,
        error,
      }}
    >
      {children}
    </NimiqContext.Provider>
  );
}

export function useNimiq() {
  return useContext(NimiqContext);
}
