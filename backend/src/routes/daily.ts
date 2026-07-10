import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { isValidWord, getRandomSourceWord } from "./words";
import { sendDailyRewardOnChain } from "../services/dailyReward";

const router = Router();
const prisma = new PrismaClient();

interface DailySession {
  sessionId: string;
  walletAddress: string;
  sourceWord: string;
  claimedWords: Set<string>;
  score: number;
  targetScore: number;
  rewardAmount: string;
  expiresAt: number;
}

const dailySessions = new Map<string, DailySession>();

// In-memory fallback database for daily challenge play records when PostgreSQL is offline
interface InMemoryPlayRecord {
  id: number;
  walletAddress: string;
  playedDate: string;
  playedAt: Date;
  score: number;
  targetScore: number;
  claimed: boolean;
  rewardAmount: string;
  txHash: string | null;
}
const inMemoryPlays: InMemoryPlayRecord[] = [];
let nextPlayRecordId = 1;

// Helper to check if a word can be built from source letters
function canBuildFromSource(word: string, source: string): boolean {
  const sourceLetterCounts: Record<string, number> = {};
  for (const char of source) {
    sourceLetterCounts[char] = (sourceLetterCounts[char] || 0) + 1;
  }
  
  for (const char of word) {
    if (!sourceLetterCounts[char] || sourceLetterCounts[char] <= 0) {
      return false;
    }
    sourceLetterCounts[char]--;
  }
  return true;
}

// GET /api/daily/status
router.get("/status", async (req: Request, res: Response) => {
  const walletAddress = req.query.walletAddress as string;
  if (!walletAddress) {
    return res.status(400).json({ error: "Missing walletAddress parameter" });
  }
  
  const walletKey = walletAddress.trim().toLowerCase();
  
  try {
    // Find the latest play for this wallet
    let lastPlay;
    try {
      lastPlay = await prisma.dailyChallengePlay.findFirst({
        where: { walletAddress: walletKey },
        orderBy: { playedAt: "desc" },
      });
    } catch (dbErr) {
      console.warn("DailyService: Database query failed, checking in-memory backup.");
      const userPlays = inMemoryPlays.filter(p => p.walletAddress === walletKey);
      userPlays.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
      lastPlay = userPlays[0] || null;
    }
    
    let played = false;
    let claimed = false;
    let nextAvailableAt = null;
    let lastPlayedAt = null;
    let txHash = null;
    
    if (lastPlay) {
      lastPlayedAt = lastPlay.playedAt;
      txHash = lastPlay.txHash;
      claimed = lastPlay.claimed;
      
      const nextTs = new Date(lastPlay.playedAt).getTime() + 24 * 60 * 60 * 1000; // 24 hours cooldown
      nextAvailableAt = new Date(nextTs).toISOString();
      played = Date.now() < nextTs;
    }
    
    return res.json({
      played,
      claimed,
      nextAvailableAt,
      lastPlayedAt,
      txHash,
      rewardAmount: "1.00", // Standard 1.00 USDT daily challenge reward
      targetScore: 50,
    });
  } catch (error) {
    console.error("DailyService: Failed to check status:", error);
    return res.status(500).json({ error: "Failed to query daily play status" });
  }
});

// POST /api/daily/start
router.post("/start", async (req: Request, res: Response) => {
  const { walletAddress } = req.body;
  if (!walletAddress || typeof walletAddress !== "string") {
    return res.status(400).json({ error: "Missing or invalid walletAddress in request body" });
  }
  
  const walletKey = walletAddress.trim().toLowerCase();
  
  try {
    // Verify cooldown
    let lastPlay;
    try {
      lastPlay = await prisma.dailyChallengePlay.findFirst({
        where: { walletAddress: walletKey },
        orderBy: { playedAt: "desc" },
      });
    } catch (dbErr) {
      console.warn("DailyService: Database query failed, checking in-memory backup.");
      const userPlays = inMemoryPlays.filter(p => p.walletAddress === walletKey);
      userPlays.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
      lastPlay = userPlays[0] || null;
    }
    
    if (lastPlay) {
      const nextTs = new Date(lastPlay.playedAt).getTime() + 24 * 60 * 60 * 1000;
      if (Date.now() < nextTs) {
        return res.status(409).json({
          error: "Cooldown active. You can play again after 24 hours.",
          nextAvailableAt: new Date(nextTs).toISOString(),
        });
      }
    }
    
    const sessionId = "daily_" + Math.random().toString(36).substring(2, 15);
    const sourceWord = getRandomSourceWord();
    
    const session: DailySession = {
      sessionId,
      walletAddress: walletKey,
      sourceWord,
      claimedWords: new Set<string>(),
      score: 0,
      targetScore: 50,
      rewardAmount: "1.00", // 1.00 USDT
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins session TTL
    };
    
    dailySessions.set(sessionId, session);
    
    return res.json({
      sessionId,
      sourceWord,
      targetScore: session.targetScore,
      rewardAmount: session.rewardAmount,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("DailyService: Failed to start session:", error);
    return res.status(500).json({ error: "Failed to start daily session" });
  }
});

// POST /api/daily/submit
router.post("/submit", (req: Request, res: Response) => {
  const { sessionId, word } = req.body;
  if (!sessionId || !word) {
    return res.status(400).json({ error: "Missing sessionId or word in body" });
  }
  
  const session = dailySessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }
  
  if (Date.now() > session.expiresAt) {
    dailySessions.delete(sessionId);
    return res.status(410).json({ error: "Session expired. Please start a new round." });
  }
  
  const cleanWord = word.trim().toLowerCase();
  
  // 1. Basic validation
  if (cleanWord.length < 3) {
    return res.status(400).json({ error: "Word must be at least 3 letters long" });
  }
  
  if (!/^[a-z]+$/.test(cleanWord)) {
    return res.status(400).json({ error: "Only letters are allowed" });
  }
  
  // 2. Can build from source
  if (!canBuildFromSource(cleanWord, session.sourceWord)) {
    return res.status(400).json({ error: `Cannot build word using letters of ${session.sourceWord.toUpperCase()}` });
  }
  
  // 3. Duplicate check
  if (session.claimedWords.has(cleanWord)) {
    return res.status(400).json({ error: "Word already found in this round" });
  }
  
  // 4. Dictionary validation
  if (!isValidWord(cleanWord)) {
    return res.status(400).json({ error: "Not a valid English word" });
  }
  
  // Calculate points: length based
  // 3 letters = 1 pt, 4 letters = 2 pts, 5 letters = 4 pts, 6+ letters = 6 pts
  let points = 1;
  if (cleanWord.length === 4) points = 2;
  else if (cleanWord.length === 5) points = 4;
  else if (cleanWord.length >= 6) points = 6;
  
  session.claimedWords.add(cleanWord);
  session.score += points;
  
  return res.json({
    valid: true,
    word: cleanWord,
    score: points,
    totalScore: session.score,
    targetScore: session.targetScore,
    claimedWords: Array.from(session.claimedWords),
  });
});

// POST /api/daily/claim
router.post("/claim", async (req: Request, res: Response) => {
  const { sessionId, walletAddress } = req.body;
  if (!sessionId || !walletAddress) {
    return res.status(400).json({ error: "Missing sessionId or walletAddress in body" });
  }
  
  const session = dailySessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }
  
  const walletKey = walletAddress.trim().toLowerCase();
  if (session.walletAddress !== walletKey) {
    return res.status(403).json({ error: "This session belongs to a different wallet" });
  }
  
  if (session.score < session.targetScore) {
    return res.status(400).json({ error: `Insufficient score. Need ${session.targetScore} points, got ${session.score}` });
  }
  
  try {
    // Unique check per day YYYY-MM-DD
    const todayDateStr = new Date().toISOString().split("T")[0];
    
    // Check if they already claimed today
    let duplicateCheck;
    try {
      duplicateCheck = await prisma.dailyChallengePlay.findFirst({
        where: {
          walletAddress: walletKey,
          playedDate: todayDateStr,
        },
      });
    } catch (dbErr) {
      console.warn("DailyService: Database query failed, checking in-memory backup.");
      duplicateCheck = inMemoryPlays.find(p => p.walletAddress === walletKey && p.playedDate === todayDateStr);
    }
    
    if (duplicateCheck) {
      return res.status(409).json({ error: "You have already claimed your daily challenge reward today." });
    }
    
    // Save daily play cooldown
    let playRecord;
    let useInMemory = false;
    try {
      playRecord = await prisma.dailyChallengePlay.create({
        data: {
          walletAddress: walletKey,
          playedDate: todayDateStr,
          score: session.score,
          targetScore: session.targetScore,
          claimed: true,
          rewardAmount: session.rewardAmount,
          txHash: null,
        },
      });
    } catch (dbErr) {
      console.warn("DailyService: Failed to save to database, using in-memory fallback.");
      playRecord = {
        id: nextPlayRecordId++,
        walletAddress: walletKey,
        playedDate: todayDateStr,
        playedAt: new Date(),
        score: session.score,
        targetScore: session.targetScore,
        claimed: true,
        rewardAmount: session.rewardAmount,
        txHash: null,
      };
      inMemoryPlays.push(playRecord);
      useInMemory = true;
    }
    
    // Trigger on-chain payment
    let txHash: string;
    try {
      txHash = await sendDailyRewardOnChain(walletKey, session.rewardAmount);
      
      // Update with txHash
      if (useInMemory) {
        const rec = inMemoryPlays.find(p => p.id === playRecord.id);
        if (rec) rec.txHash = txHash;
      } else {
        try {
          await prisma.dailyChallengePlay.update({
            where: { id: playRecord.id },
            data: { txHash },
          });
        } catch (dbErr) {
          const rec = inMemoryPlays.find(p => p.id === playRecord.id);
          if (rec) rec.txHash = txHash;
        }
      }
    } catch (contractErr: any) {
      console.error("DailyService: Failed to pay reward on-chain:", contractErr);
      
      // Delete the cooldown so they can retry
      if (useInMemory) {
        const idx = inMemoryPlays.findIndex(p => p.id === playRecord.id);
        if (idx !== -1) inMemoryPlays.splice(idx, 1);
      } else {
        try {
          await prisma.dailyChallengePlay.delete({ where: { id: playRecord.id } });
        } catch (dbErr) {
          const idx = inMemoryPlays.findIndex(p => p.id === playRecord.id);
          if (idx !== -1) inMemoryPlays.splice(idx, 1);
        }
      }
      return res.status(502).json({ error: `On-chain reward payout failed: ${contractErr.message || contractErr}` });
    }
    
    // Clear session
    dailySessions.delete(sessionId);
    
    return res.json({
      success: true,
      txHash,
      rewardAmount: session.rewardAmount,
      score: session.score,
    });
  } catch (error: any) {
    console.error("DailyService: Claim transaction logic failed:", error);
    return res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

export default router;
