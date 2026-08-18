// Nimiq and EVM Network Configuration

export const NIMIQ_CONFIG = {
  network: import.meta.env.VITE_NIMIQ_NETWORK || "testnet",
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 84532, // Base Sepolia default
  chainName: "Base Sepolia Testnet",
  rpcUrl: import.meta.env.VITE_BASE_RPC_URL || "https://sepolia.base.org",
  usdtAddress: import.meta.env.VITE_USDT_ADDRESS || "0x6e2c3479B48Cc54C5fC60F8119C6E015e3c7cfc0",
  nimAddress: import.meta.env.VITE_NIM_ADDRESS || "0xC44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
  defaultFee: "1.0",
};
