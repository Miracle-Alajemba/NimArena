import { init, requestDeviceIdentifier as sdkGetDeviceId, getHostLanguage } from "@nimiq/mini-app-sdk";
import { NIMIQ_CONFIG } from "./config";
import { parseWalletError } from "./errors";

export interface WalletState {
  address: `0x${string}` | null;
  nimBalance: string;
  usdtBalance: string;
  deviceId: string | null;
  language: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const STORAGE_KEY = "nimarena_wallet_state";

export function loadStoredWallet(): Partial<WalletState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredWallet(state: Partial<WalletState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Wallet: Failed to save to localStorage", e);
  }
}

export async function connectWallet(): Promise<{ address: `0x${string}`; deviceId: string }> {
  try {
    // 1. SDK init attempt with fallback
    try {
      await Promise.race([
        init(),
        new Promise((_, r) => setTimeout(() => r(new Error("SDK init timeout")), 300)),
      ]);
    } catch (sdkErr) {
      console.warn("Wallet: Running outside Nimiq Pay WebView. Continuing with window.ethereum fallback.", sdkErr);
    }

    // 2. Request device identifier for anti-cheat
    let deviceId = "device-" + Math.random().toString(36).substring(2, 10);
    try {
      const id = await Promise.race([
        sdkGetDeviceId({ reason: "Player identity & anti-cheat" }),
        new Promise<string>((_, r) => setTimeout(() => r(new Error("Device ID timeout")), 300)),
      ]);
      if (id) deviceId = id;
    } catch {
      console.warn("Wallet: Falling back to generated local device identifier.");
    }

    // 3. Connect EVM address via injected window.ethereum or fallback test address
    let address: `0x${string}` = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    if (typeof window !== "undefined" && window.ethereum) {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts && accounts.length > 0) {
        address = accounts[0] as `0x${string}`;
      }
    }

    saveStoredWallet({ address, deviceId, isConnected: true });
    return { address, deviceId };
  } catch (err: any) {
    throw new Error(parseWalletError(err));
  }
}

export function disconnectWallet(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Wallet: Failed to clear localStorage", e);
  }
}

export async function getBalance(address: string | null): Promise<{ nim: string; usdt: string }> {
  if (!address) return { nim: "0.00", usdt: "0.00" };

  // Simulated balances for local-first testing
  const stored = loadStoredWallet();
  const nim = stored.nimBalance || "250.00";
  const usdt = stored.usdtBalance || "45.50";

  return { nim, usdt };
}

export async function getDeviceIdentifier(): Promise<string> {
  try {
    const id = await sdkGetDeviceId({ reason: "Player verification" });
    return id;
  } catch {
    return "dev-" + Math.random().toString(36).substring(2, 12);
  }
}

export async function checkNetwork(): Promise<{ isCorrect: boolean; currentChainId: number }> {
  if (typeof window !== "undefined" && window.ethereum) {
    try {
      const chainHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      const currentChainId = parseInt(chainHex, 16);
      return { isCorrect: currentChainId === NIMIQ_CONFIG.chainId, currentChainId };
    } catch {
      return { isCorrect: true, currentChainId: NIMIQ_CONFIG.chainId };
    }
  }
  return { isCorrect: true, currentChainId: NIMIQ_CONFIG.chainId };
}

export async function requestPayment(
  amount: string,
  token: "USDT" | "NIM"
): Promise<{ success: boolean; txHash: string }> {
  console.log(`Wallet: Simulating ${amount} ${token} payment/staking transaction...`);
  await new Promise((res) => setTimeout(res, 800)); // Smooth loading simulation

  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return { success: true, txHash };
}

export function getLanguage(): string {
  return getHostLanguage() || "en";
}
