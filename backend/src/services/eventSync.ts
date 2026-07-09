import { ethers } from "ethers";
import { createPublicClient, http, parseAbiItem, Log } from "viem";
import { base, baseSepolia } from "viem/chains";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://sepolia.base.org";

// ABI items for getLogs
const duelFinalizedAbi = parseAbiItem("event DuelFinalized(uint256 indexed duelId, address indexed winner, uint256 prize)");
const triviaFinalizedAbi = parseAbiItem("event TriviaFinalized(uint256 indexed roundId, address indexed winner, uint256 prize)");

// Client setup
const isMainnet = BASE_RPC_URL.includes("mainnet.base.org") || BASE_RPC_URL.includes("mainnet");
const chain = isMainnet ? base : baseSepolia;

const client = createPublicClient({
  chain,
  transport: http(BASE_RPC_URL),
});

// Cache last synced block
let lastSyncedBlock: bigint = 0n;

/**
 * Runs the sync process: fetches logs for DuelFinalized and TriviaFinalized, 
 * and updates local database LeaderboardEntry tables.
 */
export async function syncOnChainEvents() {
  try {
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      console.warn("EventSync: CONTRACT_ADDRESS is placeholder, skipping sync.");
      return;
    }

    const currentBlock = await client.getBlockNumber();
    if (lastSyncedBlock === 0n) {
      // Start syncing from 1000 blocks back or 0
      lastSyncedBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;
    }

    if (lastSyncedBlock >= currentBlock) {
      return;
    }

    console.log(`EventSync: Syncing blocks ${lastSyncedBlock} to ${currentBlock}`);

    // Fetch DuelFinalized events
    const duelLogs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: duelFinalizedAbi,
      fromBlock: lastSyncedBlock,
      toBlock: currentBlock,
    });

    for (const log of duelLogs) {
      const winner = log.args.winner;
      const prize = log.args.prize;

      if (winner && winner !== "0x0000000000000000000000000000000000000000" && prize) {
        await updateLeaderboard("word_duel", winner, prize);
      }
    }

    // Fetch TriviaFinalized events
    const triviaLogs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: triviaFinalizedAbi,
      fromBlock: lastSyncedBlock,
      toBlock: currentBlock,
    });

    for (const log of triviaLogs) {
      const winner = log.args.winner;
      const prize = log.args.prize;

      if (winner && winner !== "0x0000000000000000000000000000000000000000" && prize) {
        await updateLeaderboard("speed_trivia", winner, prize);
      }
    }

    lastSyncedBlock = currentBlock + 1n;
  } catch (error) {
    console.error("EventSync: Error syncing events:", error);
  }
}

/**
 * Updates or inserts a leaderboard entry in the database.
 */
async function updateLeaderboard(game: "word_duel" | "speed_trivia", player: string, prize: bigint) {
  const playerAddr = player.toLowerCase();
  try {
    const existing = await prisma.leaderboardEntry.findUnique({
      where: {
        game_walletAddress: {
          game,
          walletAddress: playerAddr,
        },
      },
    });

    if (existing) {
      await prisma.leaderboardEntry.update({
        where: {
          id: existing.id,
        },
        data: {
          wins: existing.wins + 1,
          totalEarned: existing.totalEarned + prize,
          lastWinAt: new Date(),
          lastUpdated: new Date(),
        },
      });
    } else {
      await prisma.leaderboardEntry.create({
        data: {
          game,
          walletAddress: playerAddr,
          wins: 1,
          totalEarned: prize,
          lastWinAt: new Date(),
        },
      });
    }
    console.log(`EventSync: Updated leaderboard cache for ${game}: ${playerAddr} +${prize.toString()} tokens`);
  } catch (e) {
    console.error(`EventSync: Error updating leaderboard cache for ${playerAddr}:`, e);
  }
}

/**
 * Starts event listener polling loop
 */

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

export function startEventSyncService() {
  console.log("EventSync: Starting periodic on-chain event syncer...");
  // Sync immediately
  syncOnChainEvents();
  // Poll every 30 seconds
  setInterval(syncOnChainEvents, 30_000);
  setInterval(pollExpiredTriviaRounds, 60_000);
}
