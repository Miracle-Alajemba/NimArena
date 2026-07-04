// NimArena frontend configuration constants

// ⚠️ USDT_ADDRESS: Confirm on Base before deploying
// For testing/development, this placeholder is used.
// Base Mainnet USDT: 0x50c5771a74A317274967056fe675bb5344333063
// Base Sepolia USDT (Mock/Testnet): 0x6e2c3479B48Cc54C5fC60F8119C6E015e3c7cfc0 (example placeholder)
export const USDT_ADDRESS = (import.meta.env.VITE_USDT_ADDRESS || "0x6e2c3479B48Cc54C5fC60F8119C6E015e3c7cfc0") as `0x${string}`;

// ⚠️ NIM_ADDRESS: Confirm on Base before deploying
// Wrapped NIM (Mock/Testnet placeholder)
export const NIM_ADDRESS = (import.meta.env.VITE_NIM_ADDRESS || "0xC44CdDdB6a900fa2b585dd299e03d12FA4293BC") as `0x${string}`;

// Deployed NimArena contract address (confirm on Base before deploying)
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Backend API and WebSocket URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// Base RPC Endpoint
export const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL || "https://sepolia.base.org";

// Base Sepolia Chain ID (84532) or Base Mainnet (8453)
export const CHAIN_ID = 84532; 
