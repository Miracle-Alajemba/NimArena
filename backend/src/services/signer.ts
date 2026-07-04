import { ethers } from "ethers";

/**
 * Signs a trivia score proof to be submitted to the contract.
 * Message parameters hashed matching the Solidity contract:
 *   keccak256(abi.encodePacked(roundId, walletAddress, score))
 * 
 * @param roundId The ID of the trivia round.
 * @param walletAddress The address of the player.
 * @param score The final score of the player.
 * @returns The hex string signature of the backend proof.
 */
export async function signScoreProof(
  roundId: number,
  walletAddress: string,
  score: number
): Promise<string> {
  const privateKey = process.env.BACKEND_SIGNER_KEY;
  if (!privateKey) {
    throw new Error("BACKEND_SIGNER_KEY environment variable is not defined");
  }

  // Create standard signer wallet
  const signer = new ethers.Wallet(privateKey);

  // Compute solidity-compatible keccak256 hash
  // Equivalent to abi.encodePacked in Solidity: uint256, address, uint256
  const hash = ethers.solidityPackedKeccak256(
    ["uint256", "address", "uint256"],
    [roundId, walletAddress, score]
  );

  // Convert hash to bytes and sign the message
  const hashBytes = ethers.getBytes(hash);
  const signature = await signer.signMessage(hashBytes);

  return signature;
}
