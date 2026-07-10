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
const wordDuelFinalizedAbi = parseAbiItem("event WordDuelFinalized(uint256 indexed roundId, address indexed winner, uint256 prize)");
const triviaFinalizedAbi = parseAbiItem("event TriviaFinalized(uint256 indexed roundId, address indexed winner, uint256 prize)");
const wordPotFinalizedAbi = parseAbiItem("event WordPotFinalized(uint256 indexed roundId, address indexed winner, uint256 prize)");

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

    // Fetch WordDuelFinalized events
    const wordDuelLogs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: wordDuelFinalizedAbi,
      fromBlock: lastSyncedBlock,
      toBlock: currentBlock,
    });

    for (const log of wordDuelLogs) {
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

    // Fetch WordPotFinalized events
    const wordPotLogs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: wordPotFinalizedAbi,
      fromBlock: lastSyncedBlock,
      toBlock: currentBlock,
    });

    for (const log of wordPotLogs) {
      const winner = log.args.winner;
      const prize = log.args.prize;

      if (winner && winner !== "0x0000000000000000000000000000000000000000" && prize) {
        await updateLeaderboard("word_pot", winner, prize);
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
async function updateLeaderboard(game: "word_duel" | "speed_trivia" | "word_pot", player: string, prize: bigint) {
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
 * Polls for expired Word Duel rounds and finalizes them.
 */
async function pollExpiredWordDuelRounds() {
  try {
    const privateKey = process.env.BACKEND_SIGNER_KEY;
    if (!privateKey || privateKey === "0x_YOUR_BACKEND_SIGNER_PRIVATE_KEY_HERE") return;
    
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const abi = [
      "function finalizeWordDuel(uint256 duelId) external",
      "function getWordDuelRound(uint256 duelId) external view returns (address, address, uint256, uint64, uint64, address, uint256, uint256, uint256, bool)",
      "function nextDuelId() external view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    
    const maxRoundId = await contract.nextDuelId();
    if (!maxRoundId) return;

    const currentTs = Math.floor(Date.now() / 1000);
    
    for (let i = 1; i < Number(maxRoundId); i++) {
      try {
        const round = await contract.getWordDuelRound(i);
        const endTime = Number(round[4]);
        const finalized = round[9];
        
        if (endTime > 0 && currentTs > endTime && !finalized) {
          console.log(`EventSync: Found expired unfinalized word duel round ${i}. Finalizing...`);
          const tx = await contract.finalizeWordDuel(i);
          await tx.wait(1);
          console.log(`EventSync: Finalized word duel round ${i} successfully. Hash: ${tx.hash}`);
        }
      } catch (err) {
        // Skip errors for individual rounds
      }
    }
  } catch (error) {
    console.error("EventSync: Error polling expired word duel rounds:", error);
  }
}

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
      "function getTriviaRound(uint256 roundId) external view returns (address, address, uint256, uint64, uint64, address, uint256, uint256, uint256, bool)",
      "function nextTriviaRoundId() external view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    
    const maxRoundId = await contract.nextTriviaRoundId();
    if (!maxRoundId) return;

    const currentTs = Math.floor(Date.now() / 1000);
    
    for (let i = 1; i < Number(maxRoundId); i++) {
      try {
        const round = await contract.getTriviaRound(i);
        const endTime = Number(round[4]);
        const finalized = round[9];
        
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

/**
 * Polls for expired Word Pot rounds and auto-finalizes them.
 */
async function pollExpiredWordPotRounds() {
  try {
    const privateKey = process.env.BACKEND_SIGNER_KEY;
    if (!privateKey || privateKey === "0x_YOUR_BACKEND_SIGNER_PRIVATE_KEY_HERE") return;

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const abi = [
      "function finalizeWordPot(uint256 potId) external",
      "function getWordPotRound(uint256 potId) external view returns (address, address, uint256, uint64, uint64, uint64, address, uint256, uint256, uint256, bool)",
      "function nextWordPotId() external view returns (uint256)"
    ];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    const maxPotId = await contract.nextWordPotId();
    if (!maxPotId) return;

    const currentTs = Math.floor(Date.now() / 1000);

    for (let i = 1; i < Number(maxPotId); i++) {
      try {
        const round = await contract.getWordPotRound(i);
        const gameEndTime = Number(round[5]); // index 5 = gameEndTime
        const finalized = round[10];

        if (gameEndTime > 0 && currentTs > gameEndTime && !finalized) {
          console.log(`EventSync: Found expired unfinalized Word Pot round ${i}. Finalizing...`);
          const tx = await contract.finalizeWordPot(i);
          await tx.wait(1);
          console.log(`EventSync: Finalized Word Pot round ${i}. Hash: ${tx.hash}`);
        }
      } catch (err) {
        // Skip individual round errors silently
      }
    }
  } catch (error) {
    console.error("EventSync: Error polling expired Word Pot rounds:", error);
  }
}

export function startEventSyncService() {
  console.log("EventSync: Starting periodic on-chain event syncer...");
  syncOnChainEvents();
  setInterval(syncOnChainEvents, 30_000);
  setInterval(pollExpiredTriviaRounds, 60_000);
  setInterval(pollExpiredWordDuelRounds, 60_000);
  setInterval(pollExpiredWordPotRounds, 60_000);
}
