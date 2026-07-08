import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/duels/open
router.get("/open", async (req: Request, res: Response) => {
  try {
    const openDuels = await prisma.duelMatch.findMany({
      where: {
        status: "queued"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formatted = openDuels.map(d => ({
      id: d.id,
      player1: d.player1,
      entryFee: d.entryFee,
      tokenSymbol: d.tokenSymbol,
      tokenAddress: d.tokenAddress,
      status: d.status,
      createdAt: d.createdAt
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("DuelsService: Failed to retrieve open duels:", error);
    return res.status(500).json({ error: "Failed to retrieve open duels" });
  }
});

export default router;
