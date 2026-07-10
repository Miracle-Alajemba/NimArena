import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  getOrGenerateRoundLetters,
  validateSubmission,
  signWordPotScore,
} from "../services/wordPotSession";
import * as dotenv from "dotenv";

dotenv.config();

const router = Router();
const prisma = new PrismaClient();

const CONTRACT_ADDRESS = (
  process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://sepolia.base.org";

const isMainnet =
  BASE_RPC_URL.includes("mainnet.base.org") || BASE_RPC_URL.includes("mainnet");
const chain = isMainnet ? base : baseSepolia;
const client = createPublicClient({ chain, transport: http(BASE_RPC_URL) });

// Round cache (active rounds from on-chain)
let roundsCache: any[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 10_000;

const roundCreatedAbi = parseAbiItem(
  "event WordPotRoundCreated(uint256 indexed roundId, address indexed creator, address indexed token, uint256 entryFee, uint64 joinDeadline, uint64 gameEndTime)"
);

const getWordPotRoundAbi = {
  name: "getWordPotRound",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "potId", type: "uint256" }],
  outputs: [
    { name: "creator",      type: "address" },
    { name: "token",        type: "address" },
    { name: "entryFee",     type: "uint256" },
    { name: "joinDeadline", type: "uint64"  },
    { name: "gameStartTime",type: "uint64"  },
    { name: "gameEndTime",  type: "uint64"  },
    { name: "topScorer",    type: "address" },
    { name: "topScore",     type: "uint256" },
    { name: "poolBalance",  type: "uint256" },
    { name: "playerCount",  type: "uint256" },
    { name: "finalized",    type: "bool"    },
  ],
} as const;

// ─── In-memory fallback store ────────────────────────────────────────────────
interface WordPotSessionObj {
  id: string;
  roundId: number;
  walletAddress: string;
  letters: string;
  foundWords: string[];
  score: number;
  startedAt: Date;
  completedAt: Date | null;
  submitted: boolean;
  proofHash: string | null;
}
const inMemorySessions = new Map<string, WordPotSessionObj>();

// In-memory fallback for the shared round letter sets (when DB offline)
const inMemoryRoundLetters = new Map<number, string>();

// ─── GET /api/word-pot/rounds ────────────────────────────────────────────────
router.get("/rounds", async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_TTL_MS && roundsCache.length > 0) {
      return res.json(roundsCache);
    }

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return res.json([]);
    }

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
      const gameEndTime = Number(log.args.gameEndTime);

      if (gameEndTime * 1000 < now) continue; // expired round

      try {
        const d = (await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: [getWordPotRoundAbi],
          functionName: "getWordPotRound",
          args: [BigInt(roundId)],
        } as any)) as any[];

        activeRounds.push({
          roundId,
          creator:       d[0],
          tokenAddress:  d[1],
          entryFee:      d[2].toString(),
          joinDeadline:  Number(d[3]),
          gameStartTime: Number(d[4]),
          gameEndTime:   Number(d[5]),
          topScorer:     d[6],
          topScore:      Number(d[7]),
          poolBalance:   d[8].toString(),
          playerCount:   Number(d[9]),
          finalized:     d[10],
        });
      } catch (err) {
        console.error(`WordPotRoute: Failed to read round ${roundId}:`, err);
      }
    }

    roundsCache = activeRounds.sort((a, b) => b.gameEndTime - a.gameEndTime);
    lastCacheUpdate = now;
    return res.json(roundsCache);
  } catch (error) {
    console.error("WordPotRoute: Failed to list active rounds:", error);
    return res.status(500).json({ error: "Failed to fetch active rounds" });
  }
});

// ─── POST /api/word-pot/session/start ───────────────────────────────────────
// Joins a round and returns the shared letter set for that round.
router.post("/session/start", async (req: Request, res: Response) => {
  const { roundId, walletAddress } = req.body;

  if (typeof roundId !== "number" || typeof walletAddress !== "string") {
    return res.status(400).json({ error: "Missing required parameters: roundId, walletAddress" });
  }

  const userAddress = walletAddress.toLowerCase();

  try {
    // Get (or generate once) the shared letter set for this round
    let letters: string;
    try {
      letters = await getOrGenerateRoundLetters(roundId);
    } catch (genErr) {
      // Fallback: check in-memory round letters cache
      if (inMemoryRoundLetters.has(roundId)) {
        letters = inMemoryRoundLetters.get(roundId)!;
        console.warn(`WordPotRoute: Used in-memory fallback letters for round ${roundId}`);
      } else {
        throw genErr;
      }
    }

    let session: WordPotSessionObj | any;
    let useInMemory = false;

    try {
      // Check if this player already has a session for this round
      const existing = await prisma.wordPotSession.findFirst({
        where: { roundId, walletAddress: userAddress },
      });

      if (existing) {
        session = existing;
      } else {
        session = await prisma.wordPotSession.create({
          data: {
            roundId,
            walletAddress: userAddress,
            foundWords: [],
            score: 0,
          },
        });
      }
    } catch (dbErr) {
      console.warn("WordPotRoute: DB offline, creating session in-memory.");
      const existingInMem = Array.from(inMemorySessions.values()).find(
        (s) => s.roundId === roundId && s.walletAddress === userAddress
      );
      if (existingInMem) {
        session = existingInMem;
      } else {
        const tempId = "wp_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
        session = {
          id: tempId, roundId, walletAddress: userAddress, letters,
          foundWords: [], score: 0, startedAt: new Date(),
          completedAt: null, submitted: false, proofHash: null,
        };
        inMemorySessions.set(tempId, session as WordPotSessionObj);
      }
      useInMemory = true;
    }

    return res.json({
      sessionId:   session.id,
      letters,
      duration:    60, // always 60 seconds of gameplay
      playerCount: 0,  // frontend can refresh from rounds endpoint
    });
  } catch (error: any) {
    console.error("WordPotRoute: Failed to start session:", error);
    return res.status(500).json({ error: error.message || "Failed to start session" });
  }
});

// ─── POST /api/word-pot/session/submit-word ──────────────────────────────────
router.post("/session/submit-word", async (req: Request, res: Response) => {
  const { sessionId, word } = req.body;

  if (typeof sessionId !== "string" || typeof word !== "string") {
    return res.status(400).json({ error: "Missing required parameters: sessionId, word" });
  }

  try {
    let session: any = null;
    let useInMemory = false;

    try {
      session = await prisma.wordPotSession.findUnique({ where: { id: sessionId } });
    } catch {
      session = inMemorySessions.get(sessionId) || null;
      useInMemory = true;
    }

    if (!session && !useInMemory) {
      session = inMemorySessions.get(sessionId) || null;
      useInMemory = !!session;
    }

    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.completedAt) return res.status(400).json({ error: "Session already completed" });

    // Enforce 65-second grace window
    const startedTime = session.startedAt instanceof Date
      ? session.startedAt.getTime()
      : new Date(session.startedAt).getTime();
    if (Date.now() - startedTime > 65_000) {
      return res.status(400).json({ error: "Session time limit exceeded" });
    }

    // Get the shared letters for this round
    let letters: string = (session as WordPotSessionObj).letters || "";
    if (!letters) {
      try {
        letters = await getOrGenerateRoundLetters(session.roundId);
      } catch {
        letters = inMemoryRoundLetters.get(session.roundId) || "";
      }
    }

    const validation = validateSubmission(word, letters, session.foundWords);
    if (!validation.valid) {
      return res.json({ valid: false, error: validation.error, totalScore: session.score });
    }

    const newScore = session.score + validation.score;
    const newFoundWords = [...session.foundWords, word.trim().toLowerCase()];

    if (useInMemory) {
      const s = inMemorySessions.get(sessionId)!;
      s.score = newScore;
      s.foundWords = newFoundWords;
    } else {
      try {
        await prisma.wordPotSession.update({
          where: { id: sessionId },
          data: { score: newScore, foundWords: newFoundWords },
        });
      } catch {
        const s = inMemorySessions.get(sessionId) || {
          id: sessionId, roundId: session.roundId, walletAddress: session.walletAddress,
          letters, foundWords: session.foundWords, score: session.score,
          startedAt: session.startedAt, completedAt: null, submitted: false, proofHash: null,
        };
        s.score = newScore;
        s.foundWords = newFoundWords;
        inMemorySessions.set(sessionId, s as WordPotSessionObj);
      }
    }

    return res.json({ valid: true, scoreAdded: validation.score, totalScore: newScore, foundWords: newFoundWords });
  } catch (error) {
    console.error("WordPotRoute: Failed to submit word:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/word-pot/session/finalize ────────────────────────────────────
router.post("/session/finalize", async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing required parameter: sessionId" });
  }

  try {
    let session: any = null;
    let useInMemory = false;

    try {
      session = await prisma.wordPotSession.findUnique({ where: { id: sessionId } });
    } catch {
      session = inMemorySessions.get(sessionId) || null;
      useInMemory = true;
    }

    if (!session && !useInMemory) {
      session = inMemorySessions.get(sessionId) || null;
      useInMemory = !!session;
    }

    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.completedAt && session.submitted) {
      return res.status(400).json({ error: "Session already finalized" });
    }

    let proof = "";
    if (session.roundId > 0) {
      proof = await signWordPotScore(session.roundId, session.walletAddress, session.score);
    }

    if (useInMemory) {
      const s = inMemorySessions.get(sessionId)!;
      s.completedAt = new Date();
      s.submitted = true;
      s.proofHash = proof;
    } else {
      try {
        await prisma.wordPotSession.update({
          where: { id: sessionId },
          data: { completedAt: new Date(), submitted: true, proofHash: proof },
        });
      } catch {
        const s = inMemorySessions.get(sessionId) || {
          id: sessionId, roundId: session.roundId, walletAddress: session.walletAddress,
          letters: "", foundWords: session.foundWords, score: session.score,
          startedAt: session.startedAt, completedAt: new Date(), submitted: true, proofHash: proof,
        };
        s.completedAt = new Date(); s.submitted = true; s.proofHash = proof;
        inMemorySessions.set(sessionId, s as WordPotSessionObj);
      }
    }

    return res.json({ score: session.score, proof, foundWords: session.foundWords });
  } catch (error) {
    console.error("WordPotRoute: Failed to finalize session:", error);
    return res.status(500).json({ error: "Failed to finalize session" });
  }
});

// ─── GET /api/word-pot/session/:roundId/leaderboard ─────────────────────────
// Returns all finalized sessions for a round, sorted by score descending.
router.get("/session/:roundId/leaderboard", async (req: Request, res: Response) => {
  const roundId = parseInt(String(req.params.roundId), 10);
  if (isNaN(roundId)) return res.status(400).json({ error: "Invalid roundId" });

  try {
    let sessions: any[] = [];

    try {
      sessions = await prisma.wordPotSession.findMany({
        where: { roundId },
        orderBy: { score: "desc" },
      });
    } catch {
      // Fallback to in-memory
      sessions = Array.from(inMemorySessions.values())
        .filter((s) => s.roundId === roundId)
        .sort((a, b) => b.score - a.score);
    }

    const leaderboard = sessions.map((s, i) => ({
      rank:          i + 1,
      walletAddress: s.walletAddress,
      score:         s.score,
      wordCount:     s.foundWords.length,
    }));

    return res.json(leaderboard);
  } catch (error) {
    console.error("WordPotRoute: Failed to get leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
