import { ethers } from "ethers";

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

const abi = [
  "function sendDailyReward(address player, uint256 amount) external"
];

/**
 * Triggers the on-chain sendDailyReward function to send USDT to the player.
 * 
 * @param playerAddress The address of the player.
 * @param rewardAmountUSDT The amount of USDT (e.g. "1.00").
 * @returns The transaction hash.
 */
export async function sendDailyRewardOnChain(
  playerAddress: string,
  rewardAmountUSDT: string
): Promise<string> {
  const privateKey = process.env.BACKEND_SIGNER_KEY;
  if (!privateKey) {
    throw new Error("BACKEND_SIGNER_KEY environment variable is not defined");
  }

  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.warn("sendDailyRewardOnChain: running in mock mode, bypassing transaction.");
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // USDT uses 6 decimals
    const amountRaw = ethers.parseUnits(rewardAmountUSDT, 6);

    console.log(`dailyRewardService: Dispatching sendDailyReward(${playerAddress}, ${rewardAmountUSDT} USDT) on-chain...`);
    const tx = await contract.sendDailyReward(playerAddress, amountRaw);
    console.log(`dailyRewardService: Sent tx. Hash: ${tx.hash}`);

    const receipt = await tx.wait(1);
    console.log(`dailyRewardService: Confirmed in block ${receipt.blockNumber}`);
    return tx.hash;
  } catch (error: any) {
    console.error("dailyRewardService: On-chain transaction failed:", error);
    throw new Error(`Failed to send daily reward on-chain: ${error.message || error}`);
  }
}
