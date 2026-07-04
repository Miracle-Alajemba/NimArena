import { createPublicClient, createWalletClient, custom, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASE_RPC_URL } from "../config/constants";

// Determine chain based on RPC endpoint
const isMainnet = BASE_RPC_URL.includes("mainnet.base.org") || BASE_RPC_URL.includes("mainnet");
export const targetChain = isMainnet ? base : baseSepolia;

// Public client for fast reads directly from the blockchain RPC
export const publicClient = createPublicClient({
  chain: targetChain,
  transport: http(BASE_RPC_URL),
});

// Wallet client that routes write transactions through Nimiq Pay's injected window.ethereum
export const walletClient = typeof window !== "undefined" && window.ethereum
  ? createWalletClient({
      chain: targetChain,
      transport: custom(window.ethereum),
    })
  : null;
