import re

with open('backend/src/services/eventSync.ts', 'r') as f:
    content = f.read()

# Import ethers
if "import { ethers } from \"ethers\";" not in content:
    content = "import { ethers } from \"ethers\";\n" + content

# Add polling function
polling_func = """
/**
 * Polls for expired trivia rounds and finalizes them using the backend signer.
 */
async function pollExpiredTriviaRounds() {
  try {
    const privateKey = process.env.BACKEND_SIGNER_KEY;
    if (!privateKey || privateKey === "0x_YOUR_BACKEND_SIGNER_PRIVATE_KEY_HERE") return;
    
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // We only need the finalizeTrivia abi and a way to read rounds
    const abi = [
      "function finalizeTrivia(uint256 roundId) external",
      "function getTriviaRound(uint256 roundId) external view returns (address, uint256, uint64, uint64, address, uint256, uint256, uint256, bool)",
      "function nextTriviaRoundId() external view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    
    const maxRoundId = await contract.nextTriviaRoundId();
    if (!maxRoundId) return;

    const currentTs = Math.floor(Date.now() / 1000);
    
    for (let i = 1; i < Number(maxRoundId); i++) {
      try {
        const round = await contract.getTriviaRound(i);
        const endTime = Number(round[3]);
        const finalized = round[8];
        
        // If expired and not finalized, call finalizeTrivia
        if (endTime > 0 && currentTs > endTime && !finalized) {
          console.log(`EventSync: Found expired unfinalized trivia round ${i}. Finalizing...`);
          const tx = await contract.finalizeTrivia(i);
          await tx.wait(1);
          console.log(`EventSync: Finalized trivia round ${i} successfully. Hash: ${tx.hash}`);
        }
      } catch (err) {
        // Skip errors for individual rounds
      }
    }
  } catch (error) {
    console.error("EventSync: Error polling expired trivia rounds:", error);
  }
}
"""

if "pollExpiredTriviaRounds" not in content:
    # Insert function before startEventSyncService
    content = content.replace("export function startEventSyncService() {", polling_func + "\nexport function startEventSyncService() {")
    
    # Add setInterval
    content = content.replace("setInterval(syncOnChainEvents, 30_000);", "setInterval(syncOnChainEvents, 30_000);\n  setInterval(pollExpiredTriviaRounds, 60_000);")
    
    with open('backend/src/services/eventSync.ts', 'w') as f:
        f.write(content)
    print("Success: pollExpiredTriviaRounds added")
else:
    print("pollExpiredTriviaRounds already exists")
