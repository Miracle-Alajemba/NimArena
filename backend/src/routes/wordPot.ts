import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  getOrGenerateRoundSourceWord,
  validateSubmission,
  signWordPotScore,
  generateSourceWord,
} from "../services/wordPotSession";
import { getWordScore, canFormWord } from "../services/wordDuelSession";
import { sendDailyRewardOnChain } from "../services/dailyReward";
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
  sourceWord: string;
  foundWords: string[];
  score: number;
  startedAt: Date;
  completedAt: Date | null;
  submitted: boolean;
  proofHash: string | null;
}
const inMemorySessions = new Map<string, WordPotSessionObj>();

// In-memory fallback for the shared round source words (when DB offline)
const inMemoryRoundSourceWords = new Map<number, string>();

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
    // Get (or generate once) the shared source word for this round
    let sourceWord: string;
    try {
      sourceWord = await getOrGenerateRoundSourceWord(roundId);
    } catch (genErr) {
      // Fallback: check in-memory round source words cache
      if (inMemoryRoundSourceWords.has(roundId)) {
        sourceWord = inMemoryRoundSourceWords.get(roundId)!;
        console.warn(`WordPotRoute: Used in-memory fallback source word for round ${roundId}`);
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
          id: tempId, roundId, walletAddress: userAddress, sourceWord,
          foundWords: [], score: 0, startedAt: new Date(),
          completedAt: null, submitted: false, proofHash: null,
        };
        inMemorySessions.set(tempId, session as WordPotSessionObj);
      }
      useInMemory = true;
    }

    return res.json({
      sessionId:   session.id,
      sourceWord,
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

    // Get the shared source word for this round
    let sourceWord: string = (session as WordPotSessionObj).sourceWord || "";
    if (!sourceWord) {
      try {
        sourceWord = await getOrGenerateRoundSourceWord(session.roundId);
      } catch {
        sourceWord = inMemoryRoundSourceWords.get(session.roundId) || "";
      }
    }

    const validation = validateSubmission(word, sourceWord, session.foundWords);
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
          sourceWord, foundWords: session.foundWords, score: session.score,
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
          sourceWord: "", foundWords: session.foundWords, score: session.score,
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

// ─── DAILY CHALLENGE ROUTES ───────────────────────────────────────────────

const wordPotDailySessions = new Map<string, any>();

// GET /api/word-pot/daily/status
router.get("/daily/status", async (req: Request, res: Response) => {
  const walletAddress = req.query.walletAddress as string;
  if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });
  
  const walletKey = walletAddress.trim().toLowerCase();
  
  try {
    const todayDateStr = new Date().toISOString().split("T")[0];
    const play = await prisma.wordPotDaily.findFirst({
      where: { walletAddress: walletKey, date: todayDateStr },
    });
    
    let played = false;
    let claimed = false;
    let nextAvailableAt = null;
    let lastPlayedAt = null;
    let txHash = null;
    
    if (play) {
      played = true;
      claimed = play.completed;
      txHash = play.txHash;
      if (play.completedAt) {
        lastPlayedAt = play.completedAt;
        const nextTs = new Date(todayDateStr + "T00:00:00.000Z").getTime() + 24 * 60 * 60 * 1000;
        nextAvailableAt = new Date(nextTs).toISOString();
      }
    }
    
    return res.json({
      played,
      claimed,
      nextAvailableAt,
      lastPlayedAt,
      txHash,
      rewardAmount: "1.00",
      targetScore: 50,
    });
  } catch (error) {
    console.error("WordPotDaily: Status failed:", error);
    return res.status(500).json({ error: "Status check failed" });
  }
});

// GET /api/word-pot/daily/letters
router.get("/daily/letters", async (req: Request, res: Response) => {
  const walletAddress = req.query.walletAddress as string;
  if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

  const walletKey = walletAddress.trim().toLowerCase();
  const todayDateStr = new Date().toISOString().split("T")[0];

  try {
    // 1. Check/Generate Daily Letters
    let dailyLetters = await prisma.wordPotDailyLetters.findUnique({
      where: { date: todayDateStr }
    });

    if (!dailyLetters) {
      try {
        const freshSourceWord = generateSourceWord();
        dailyLetters = await prisma.wordPotDailyLetters.create({
          data: { date: todayDateStr, letters: freshSourceWord }
        });
        console.log(`WordPotDaily: Generated fresh source word for ${todayDateStr}`);
      } catch (e: any) {
        // Handle race conditions
        if (e.code === 'P2002') {
          dailyLetters = await prisma.wordPotDailyLetters.findUnique({ where: { date: todayDateStr } });
        } else {
          throw e;
        }
      }
    }

    if (!dailyLetters) throw new Error("Failed to get daily letters");

    // 2. Cooldown check
    const existingPlay = await prisma.wordPotDaily.findUnique({
      where: {
        walletAddress_date: { walletAddress: walletKey, date: todayDateStr }
      }
    });

    if (existingPlay && existingPlay.completed) {
      const nextTs = new Date(todayDateStr + "T00:00:00.000Z").getTime() + 24 * 60 * 60 * 1000;
      return res.status(409).json({
        error: "Cooldown active. You can play again after 24 hours.",
        nextAvailableAt: new Date(nextTs).toISOString(),
      });
    }

    // 3. Start memory session
    const sessionId = "wp_daily_" + Math.random().toString(36).substring(2, 15);
    wordPotDailySessions.set(sessionId, {
      sessionId,
      walletAddress: walletKey,
      sourceWord: dailyLetters.letters,
      claimedWords: new Set<string>(),
      score: 0,
      targetScore: 50,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return res.json({
      sessionId,
      sourceWord: dailyLetters.letters,
      expiresAt: Date.now() + 15 * 60 * 1000
    });
  } catch (error) {
    console.error("WordPotDaily: Failed to get letters:", error);
    return res.status(500).json({ error: "Failed to get letters" });
  }
});

// POST /api/word-pot/daily/submit-word
router.post("/daily/submit-word", async (req: Request, res: Response) => {
  const { sessionId, word } = req.body;
  if (!sessionId || !word) return res.status(400).json({ error: "Missing sessionId or word" });

  const session = wordPotDailySessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  if (Date.now() > session.expiresAt) {
    wordPotDailySessions.delete(sessionId);
    return res.status(410).json({ error: "Session expired." });
  }

  const cleanWord = word.trim().toLowerCase();

  // Validate using existing logic
  const validation = validateSubmission(cleanWord, session.sourceWord, Array.from(session.claimedWords));
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const points = getWordScore(cleanWord);
  session.claimedWords.add(cleanWord);
  session.score += points;

  return res.json({
    valid: true,
    word: cleanWord,
    scoreAdded: points,
    totalScore: session.score,
    targetScore: session.targetScore
  });
});

// POST /api/word-pot/daily/claim
router.post("/daily/claim", async (req: Request, res: Response) => {
  const { sessionId, walletAddress } = req.body;
  if (!sessionId || !walletAddress) return res.status(400).json({ error: "Missing parameters" });

  const session = wordPotDailySessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const walletKey = walletAddress.trim().toLowerCase();
  if (session.walletAddress !== walletKey) return res.status(403).json({ error: "Invalid wallet" });

  if (session.score < session.targetScore) {
    return res.status(400).json({ error: `Need ${session.targetScore} points, got ${session.score}` });
  }

  const todayDateStr = new Date().toISOString().split("T")[0];

  try {
    const existing = await prisma.wordPotDaily.findUnique({
      where: { walletAddress_date: { walletAddress: walletKey, date: todayDateStr } }
    });

    if (existing && existing.completed) {
      return res.status(409).json({ error: "Already claimed today." });
    }

    // Trigger on-chain payment
    let txHash: string;
    try {
      txHash = await sendDailyRewardOnChain(walletKey, "1.0");
    } catch (contractErr: any) {
      return res.status(502).json({ error: `Payout failed: ${contractErr.message}` });
    }

    // Save to DB
    await prisma.wordPotDaily.upsert({
      where: { walletAddress_date: { walletAddress: walletKey, date: todayDateStr } },
      update: {
        score: session.score,
        foundWords: Array.from(session.claimedWords),
        completed: true,
        completedAt: new Date(),
        txHash
      },
      create: {
        walletAddress: walletKey,
        date: todayDateStr,
        score: session.score,
        foundWords: Array.from(session.claimedWords),
        completed: true,
        completedAt: new Date(),
        txHash
      }
    });

    wordPotDailySessions.delete(sessionId);

    return res.json({ success: true, txHash });
  } catch (error) {
    console.error("WordPotDaily: Claim failed:", error);
    return res.status(500).json({ error: "Claim failed" });
  }
});

export default router;
