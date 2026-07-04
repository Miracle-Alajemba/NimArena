import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/leaderboard/:game
router.get("/:game", async (req: Request, res: Response) => {
  const { game } = req.params; // "word_duel" | "speed_trivia"
  const period = req.query.period as string || "alltime"; // "today" | "alltime"
  const playerAddress = req.query.playerAddress as string; // optional, to find player's own rank

  if (game !== "word_duel" && game !== "speed_trivia") {
    return res.status(400).json({ error: "Invalid game parameter. Must be word_duel or speed_trivia" });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Build query conditions
    const whereCondition: any = { game };
    if (period === "today") {
      whereCondition.lastWinAt = {
        gte: todayStart,
      };
    }

    // Fetch top 50 entries
    const entries = await prisma.leaderboardEntry.findMany({
      where: whereCondition,
      orderBy: { wins: "desc" },
      take: 50,
    });

    const formattedEntries = entries.map((entry, idx) => ({
      rank: idx + 1,
      walletAddress: entry.walletAddress,
      wins: entry.wins,
      totalEarned: entry.totalEarned.toString(),
      lastWinAt: entry.lastWinAt,
    }));

    let playerRankData = null;

    // If playerAddress is provided, find their specific rank
    if (playerAddress) {
      const targetAddress = playerAddress.trim().toLowerCase();

      // Find player entry
      const playerEntry = await prisma.leaderboardEntry.findFirst({
        where: {
          game,
          walletAddress: targetAddress,
        },
      });

      if (playerEntry) {
        // Calculate rank by counting how many entries have more wins
        const countCondition: any = {
          game,
          wins: {
            gt: playerEntry.wins,
          },
        };

        if (period === "today") {
          countCondition.lastWinAt = {
            gte: todayStart,
          };
        }

        const betterPlayersCount = await prisma.leaderboardEntry.count({
          where: countCondition,
        });

        playerRankData = {
          rank: betterPlayersCount + 1,
          walletAddress: playerEntry.walletAddress,
          wins: playerEntry.wins,
          totalEarned: playerEntry.totalEarned.toString(),
          lastWinAt: playerEntry.lastWinAt,
        };
      } else {
        // Player has no wins yet
        playerRankData = {
          rank: "-",
          walletAddress: targetAddress,
          wins: 0,
          totalEarned: "0",
          lastWinAt: null,
        };
      }
    }

    return res.json({
      leaderboard: formattedEntries,
      playerRank: playerRankData,
    });
  } catch (error) {
    console.error("LeaderboardService: Failed to fetch leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
