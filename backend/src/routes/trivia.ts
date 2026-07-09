import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { signScoreProof } from "../services/signer";
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

// Cache for active trivia rounds
let roundsCache: any[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

// ABI item for TriviaRoundCreated event
const triviaRoundCreatedAbi = parseAbiItem(
  "event TriviaRoundCreated(uint256 indexed roundId, address indexed creator, uint256 entryFee, uint64 endTime)"
);

// NimArena ABI slice for viewing round info
const getTriviaRoundAbi = {
  name: "getTriviaRound",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "roundId", type: "uint256" }],
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

// GET /api/trivia/rounds
router.get("/rounds", async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_TTL_MS && roundsCache.length > 0) {
      return res.json(roundsCache);
    }

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return res.json([]);
    }

    // Sync active rounds by reading TriviaRoundCreated events
    const currentBlock = await client.getBlockNumber();
    const startBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

    const logs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: triviaRoundCreatedAbi,
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

      // Query round details from contract to get current pool and player count
      try {
        const roundData = (await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: [getTriviaRoundAbi],
          functionName: "getTriviaRound",
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
        console.error(`TriviaService: Failed to read round details for round ${roundId}:`, err);
      }
    }

    // Sort rounds by endTime descending
    roundsCache = activeRounds.sort((a, b) => b.endTime - a.endTime);
    lastCacheUpdate = now;

    return res.json(roundsCache);
  } catch (error) {
    console.error("TriviaService: Failed to list active rounds:", error);
    return res.status(500).json({ error: "Failed to fetch active rounds" });
  }
});

// GET /api/trivia/practice/questions
router.get("/practice/questions", async (req: Request, res: Response) => {
  try {
    const totalQuestions = await prisma.triviaQuestion.count();
    if (totalQuestions < 10) {
      return res.status(500).json({ error: "Not enough questions in database." });
    }

    // Fetch all question IDs
    const allQuestions = await prisma.triviaQuestion.findMany({
      select: { id: true }
    });
    
    // Pick 10 random IDs
    const shuffled = allQuestions.map(q => q.id).sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, 10);

    // Fetch the actual questions
    const questions = await prisma.triviaQuestion.findMany({
      where: {
        id: { in: selectedIds }
      },
      select: {
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctIdx: true, // We return correctIdx for client-side evaluation
        category: true,
        difficulty: true
      }
    });

    // Shuffle the result to match the random selected order (findMany doesn't preserve IN order)
    const sortedQuestions = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean);

    return res.json(sortedQuestions);
  } catch (error) {
    console.error("TriviaService: Failed to fetch practice questions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/trivia/session/start
router.post("/session/start", async (req: Request, res: Response) => {
  const { roundId, walletAddress } = req.body;

  if (typeof roundId !== "number" || typeof walletAddress !== "string") {
    return res.status(400).json({ error: "Missing required parameters: roundId, walletAddress" });
  }

  const userAddress = walletAddress.toLowerCase();

  try {
    // 1. Fetch 10 random questions
    const totalQuestions = await prisma.triviaQuestion.count();
    if (totalQuestions < 10) {
      return res.status(500).json({ error: "Not enough questions in database. Please run seed script first." });
    }

    // Fetch all question IDs
    const allQuestions = await prisma.triviaQuestion.findMany({
      select: { id: true }
    });
    
    // Pick 10 random IDs
    const shuffled = allQuestions.map(q => q.id).sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, 10);

    // 2. Create the TriviaSession
    const session = await prisma.triviaSession.create({
      data: {
        roundId,
        walletAddress: userAddress,
        questionIds: selectedIds,
        answers: [],
        currentQ: 0,
        score: 0,
      }
    });

    return res.json({
      sessionId: session.id,
      totalQuestions: 10,
    });
  } catch (error) {
    console.error("TriviaService: Failed to start session:", error);
    return res.status(500).json({ error: "Failed to start session" });
  }
});

// GET /api/trivia/session/:id/question/:n
router.get("/session/:id/question/:n", async (req: Request, res: Response) => {
  const { id, n } = req.params;
  const questionIndex = Number(n);

  if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= 10) {
    return res.status(400).json({ error: "Invalid question index" });
  }

  try {
    const session = await prisma.triviaSession.findUnique({ where: { id: id as string } });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.completedAt !== null) {
      return res.status(400).json({ error: "Session already completed" });
    }

    if (session.currentQ !== questionIndex) {
      return res.status(400).json({ error: `Sequential access violation. Current question is ${session.currentQ}` });
    }

    const questionId = session.questionIds[questionIndex];
    const question = await prisma.triviaQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        category: true,
        difficulty: true
      }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    return res.json(question);
  } catch (error) {
    console.error("TriviaService: Failed to retrieve question:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/trivia/session/:id/answer
router.post("/session/:id/answer", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { answerIndex, timeRemainingMs } = req.body;

  if (typeof answerIndex !== "number" || typeof timeRemainingMs !== "number") {
    return res.status(400).json({ error: "Missing answerIndex or timeRemainingMs" });
  }

  try {
    const session = await prisma.triviaSession.findUnique({ where: { id: id as string } });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.completedAt !== null) {
      return res.status(400).json({ error: "Session already completed" });
    }

    const questionIndex = session.currentQ;
    if (questionIndex >= 10) {
      return res.status(400).json({ error: "All questions already answered" });
    }

    const questionId = session.questionIds[questionIndex];
    const question = await prisma.triviaQuestion.findUnique({ where: { id: questionId } });
    
    if (!question) {
      return res.status(500).json({ error: "Question not found in database" });
    }

    // Determine correct/incorrect
    const isCorrect = question.correctIdx === answerIndex;

    // Calculate score for this question:
    // Base score = 100 points.
    // Speed bonus = timeRemainingMs / 30000 * 50 points.
    // Max score per question = 150 points.
    let scoreAdded = 0;
    if (isCorrect) {
      const clampedTime = Math.max(0, Math.min(30000, timeRemainingMs));
      const speedBonus = Math.round((clampedTime / 30000) * 50);
      scoreAdded = 100 + speedBonus;
    }

    const newScore = session.score + scoreAdded;
    const newAnswers = [...session.answers, answerIndex];
    const nextQ = questionIndex + 1;

    // Update session
    await prisma.triviaSession.update({
      where: { id: id as string },
      data: {
        score: newScore,
        answers: newAnswers,
        currentQ: nextQ,
      }
    });

    return res.json({
      correct: isCorrect,
      correctIndex: question.correctIdx,
      scoreAdded,
      totalScore: newScore,
      nextIndex: nextQ,
    });
  } catch (error) {
    console.error("TriviaService: Failed to process answer:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/trivia/session/:id/submit
router.post("/session/:id/submit", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const session = await prisma.triviaSession.findUnique({ where: { id: id as string } });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.completedAt !== null && session.submitted) {
      return res.status(400).json({ error: "Session already submitted and finalized" });
    }

    if (session.currentQ < 10) {
      return res.status(400).json({ error: "Session is not complete. Must answer all 10 questions first." });
    }

    // Generate signed proof for the smart contract
    const proof = await signScoreProof(
      session.roundId,
      session.walletAddress,
      session.score
    );

    // Finalize session in database
    await prisma.triviaSession.update({
      where: { id: id as string },
      data: {
        completedAt: new Date(),
        submitted: true,
        proofHash: proof
      }
    });

    return res.json({
      score: session.score,
      proof,
    });
  } catch (error) {
    console.error("TriviaService: Failed to submit score:", error);
    return res.status(500).json({ error: "Failed to generate score signature proof" });
  }
});

export default router;
