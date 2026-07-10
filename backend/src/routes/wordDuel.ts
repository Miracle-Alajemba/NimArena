import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { generateLetters, validateSubmission, signWordDuelScore } from "../services/wordDuelSession";
import * as dotenv from "dotenv";

dotenv.config();

const router = Router();
const prisma = new PrismaClient();

const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://sepolia.base.org";

const isMainnet = BASE_RPC_URL.includes("mainnet.base.org") || BASE_RPC_URL.includes("mainnet");
const chain = isMainnet ? base : baseSepolia;
const client = createPublicClient({
  chain,
  transport: http(BASE_RPC_URL),
});

// Cache for active word duel rounds
let roundsCache: any[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

// ABI item for WordDuelRoundCreated event
const roundCreatedAbi = parseAbiItem(
  "event WordDuelRoundCreated(uint256 indexed roundId, address indexed creator, address indexed token, uint256 entryFee, uint64 endTime)"
);

// NimArena ABI slice for viewing round info
const getWordDuelRoundAbi = {
  name: "getWordDuelRound",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "duelId", type: "uint256" }],
  outputs: [
    { name: "creator", type: "address" },
    { name: "token", type: "address" },
    { name: "entryFee", type: "uint256" },
    { name: "startTime", type: "uint64" },
    { name: "endTime", type: "uint64" },
    { name: "topScorer", type: "address" },
    { name: "topScore", type: "uint256" },
    { name: "poolBalance", type: "uint256" },
    { name: "playerCount", type: "uint256" },
    { name: "finalized", type: "bool" },
  ],
} as const;

// GET /api/word-duel/rounds
router.get("/rounds", async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_TTL_MS && roundsCache.length > 0) {
      return res.json(roundsCache);
    }

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return res.json([]);
    }

    // Sync active rounds by reading WordDuelRoundCreated events
    const currentBlock = await client.getBlockNumber();
    const startBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

    const logs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: roundCreatedAbi,
      fromBlock: startBlock,
      toBlock: currentBlock,
    });

    const activeRounds = [];

    for (const log of logs) {
      const roundId = Number(log.args.roundId);
      const entryFee = log.args.entryFee?.toString();
      const endTime = Number(log.args.endTime);

      const isExpired = endTime * 1000 < now;
      if (isExpired) continue;

      // Query round details from contract
      try {
        const roundData = (await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: [getWordDuelRoundAbi],
          functionName: "getWordDuelRound",
          args: [BigInt(roundId)],
        } as any)) as any[];

        activeRounds.push({
          roundId,
          creator: roundData[0],
          tokenAddress: roundData[1],
          entryFee: roundData[2].toString(),
          startTime: Number(roundData[3]),
          endTime: Number(roundData[4]),
          topScorer: roundData[5],
          topScore: Number(roundData[6]),
          poolBalance: roundData[7].toString(),
          playerCount: Number(roundData[8]),
          finalized: roundData[9],
        });
      } catch (err) {
        console.error(`WordDuelService: Failed to read round details for round ${roundId}:`, err);
      }
    }

    // Sort rounds by endTime descending
    roundsCache = activeRounds.sort((a, b) => b.endTime - a.endTime);
    lastCacheUpdate = now;

    return res.json(roundsCache);
  } catch (error) {
    console.error("WordDuelService: Failed to list active rounds:", error);
    return res.status(500).json({ error: "Failed to fetch active rounds" });
  }
});

// POST /api/word-duel/session/start
router.post("/session/start", async (req: Request, res: Response) => {
  const { roundId, walletAddress, difficulty } = req.body;

  if (typeof roundId !== "number" || typeof walletAddress !== "string") {
    return res.status(400).json({ error: "Missing required parameters: roundId, walletAddress" });
  }

  const userAddress = walletAddress.toLowerCase();

  try {
    const letters = generateLetters(difficulty || "medium");

    const session = await prisma.wordDuelSession.create({
      data: {
        roundId,
        walletAddress: userAddress,
        letters,
        foundWords: [],
        score: 0,
      },
    });

    return res.json({
      sessionId: session.id,
      letters,
      duration: 60, // 60 seconds
    });
  } catch (error: any) {
    console.error("WordDuelService: Failed to start session:", error);
    return res.status(500).json({ error: error.message || "Failed to start session" });
  }
});

// POST /api/word-duel/session/submit-word
router.post("/session/submit-word", async (req: Request, res: Response) => {
  const { sessionId, word } = req.body;

  if (typeof sessionId !== "string" || typeof word !== "string") {
    return res.status(400).json({ error: "Missing required parameters: sessionId, word" });
  }

  try {
    const session = await prisma.wordDuelSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.completedAt !== null) {
      return res.status(400).json({ error: "Session already completed" });
    }

    // Verify time limit (60s + 5s grace period)
    const elapsedMs = Date.now() - session.startedAt.getTime();
    if (elapsedMs > 65000) {
      return res.status(400).json({ error: "Session time limit exceeded" });
    }

    const validation = validateSubmission(word, session.letters, session.foundWords);
    if (!validation.valid) {
      return res.json({
        valid: false,
        error: validation.error,
        totalScore: session.score,
      });
    }

    const newScore = session.score + validation.score;
    const newFoundWords = [...session.foundWords, word.trim().toLowerCase()];

    await prisma.wordDuelSession.update({
      where: { id: sessionId },
      data: {
        score: newScore,
        foundWords: newFoundWords,
      },
    });

    return res.json({
      valid: true,
      scoreAdded: validation.score,
      totalScore: newScore,
      foundWords: newFoundWords,
    });
  } catch (error) {
    console.error("WordDuelService: Failed to submit word:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/word-duel/session/finalize
router.post("/session/finalize", async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing required parameter: sessionId" });
  }

  try {
    const session = await prisma.wordDuelSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.completedAt !== null && session.submitted) {
      return res.status(400).json({ error: "Session already finalized" });
    }

    let proof = "";
    // If it's not a practice session (roundId > 0), generate signed proof
    if (session.roundId > 0) {
      proof = await signWordDuelScore(session.roundId, session.walletAddress, session.score);
    }

    await prisma.wordDuelSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        submitted: true,
        proofHash: proof,
      },
    });

    return res.json({
      score: session.score,
      proof,
      foundWords: session.foundWords,
    });
  } catch (error) {
    console.error("WordDuelService: Failed to finalize session:", error);
    return res.status(500).json({ error: "Failed to finalize session" });
  }
});

export default router;
