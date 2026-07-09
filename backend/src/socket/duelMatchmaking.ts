import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { isValidWord } from "../routes/words";
import { ethers } from "ethers";

const prisma = new PrismaClient();

// Map to track active socket connections by wallet address
const activeSockets = new Map<string, string>(); // walletAddress -> socketId
const socketWallets = new Map<string, string>(); // socketId -> walletAddress

// Track match commit and reveal states in memory for fast coordination
interface MatchState {
  player1Committed: boolean;
  player2Committed: boolean;
  player1Word: string;
  player2Word: string;
}
const activeMatches = new Map<number, MatchState>(); // dbMatchId -> MatchState

export function registerDuelHandlers(io: Server, socket: Socket) {
  // Create private match (Play with Friend)
  socket.on("duel:create_private", async (data: { entryFee: string; walletAddress: string; tokenAddress: string; tokenSymbol: string }) => {
    const { entryFee, walletAddress, tokenAddress, tokenSymbol } = data;
    if (!entryFee || !walletAddress || !tokenAddress || !tokenSymbol) return;

    const userAddr = walletAddress.toLowerCase();
    activeSockets.set(userAddr, socket.id);
    socketWallets.set(socket.id, userAddr);

    console.log(`Socket: Player ${userAddr} creating private duel with fee ${entryFee}`);

    try {
      const match = await prisma.duelMatch.create({
        data: {
          player1: userAddr,
          entryFee,
          tokenAddress,
          tokenSymbol,
          status: "private_queued"
        }
      });
      
      socket.emit("duel:private_created", {
        matchId: match.id,
        entryFee: match.entryFee
      });
    } catch (error) {
      console.error("Socket: Error creating private duel:", error);
      socket.emit("duel:error", { message: "Failed to create private match" });
    }
  });

  // Join private match (Play with Friend)
  socket.on("duel:join_private", async (data: { matchId: number; walletAddress: string }) => {
    const { matchId, walletAddress } = data;
    if (!matchId || !walletAddress) return;

    const userAddr = walletAddress.toLowerCase();
    activeSockets.set(userAddr, socket.id);
    socketWallets.set(socket.id, userAddr);

    console.log(`Socket: Player ${userAddr} joining private match ${matchId}`);

    try {
      const openMatch = await prisma.duelMatch.findFirst({
        where: {
          id: matchId,
          status: "private_queued"
        }
      });

      if (!openMatch) {
        return socket.emit("duel:error", { message: "Private match not found or already matched" });
      }

      if (openMatch.player1 === userAddr) {
        return socket.emit("duel:error", { message: "Cannot join your own match" });
      }

      // Match found! Update DuelMatch in DB
      const matched = await prisma.duelMatch.update({
        where: { id: openMatch.id },
        data: {
          player2: userAddr,
          status: "matched"
        }
      });

      console.log(`Socket: Private Match paired! Match ID: ${matched.id} (${matched.player1} vs ${matched.player2})`);

      // Initialize state
      activeMatches.set(matched.id, {
        player1Committed: false,
        player2Committed: false,
        player1Word: "",
        player2Word: ""
      });

      // Notify both players
      const s1 = activeSockets.get(matched.player1);
      const s2 = activeSockets.get(userAddr);

      if (s1) {
        io.to(s1).emit("duel:matched", {
          matchId: matched.id,
          opponent: matched.player2,
          entryFee: matched.entryFee,
          tokenAddress: matched.tokenAddress,
          tokenSymbol: matched.tokenSymbol,
          role: "player1"
        });
      }
      if (s2) {
        io.to(s2).emit("duel:matched", {
          matchId: matched.id,
          opponent: matched.player1,
          entryFee: matched.entryFee,
          tokenAddress: matched.tokenAddress,
          tokenSymbol: matched.tokenSymbol,
          role: "player2"
        });
      }
    } catch (error) {
      console.error("Socket: Error joining private duel:", error);
      socket.emit("duel:error", { message: "Failed to join private match" });
    }
  });

  // Client joins the queue
  socket.on("duel:join_queue", async (data: { entryFee: string; walletAddress: string; tokenAddress: string; tokenSymbol: string }) => {
    const { entryFee, walletAddress, tokenAddress, tokenSymbol } = data;
    if (!entryFee || !walletAddress || !tokenAddress || !tokenSymbol) return;

    const userAddr = walletAddress.toLowerCase();
    activeSockets.set(userAddr, socket.id);
    socketWallets.set(socket.id, userAddr);

    console.log(`Socket: Player ${userAddr} joined queue for fee ${entryFee}`);

    try {
      // Look for an existing open match in queue with same entry fee
      const openMatch = await prisma.duelMatch.findFirst({
        where: {
          entryFee,
          tokenAddress,
          status: "queued",
          player1: { not: userAddr } // Don't match with self
        },
        orderBy: { createdAt: "asc" }
      });

      if (openMatch) {
        // Match found! Update DuelMatch in DB
        const matched = await prisma.duelMatch.update({
          where: { id: openMatch.id },
          data: {
            player2: userAddr,
            status: "matched"
          }
        });

        console.log(`Socket: Match found! DB Match ID: ${matched.id} (${matched.player1} vs ${matched.player2})`);

        // Initialize state
        activeMatches.set(matched.id, {
          player1Committed: false,
          player2Committed: false,
          player1Word: "",
          player2Word: ""
        });

        // Notify both players
        const s1 = activeSockets.get(matched.player1);
        const s2 = activeSockets.get(userAddr);

        if (s1) {
          io.to(s1).emit("duel:matched", {
            matchId: matched.id,
            opponent: matched.player2,
            entryFee: matched.entryFee,
            tokenAddress: matched.tokenAddress,
            tokenSymbol: matched.tokenSymbol,
            role: "player1"
          });
        }
        if (s2) {
          io.to(s2).emit("duel:matched", {
            matchId: matched.id,
            opponent: matched.player1,
            entryFee: matched.entryFee,
            tokenAddress: matched.tokenAddress,
            tokenSymbol: matched.tokenSymbol,
            role: "player2"
          });
        }
      } else {
        // No match. Create new queue entry in DB
        // Check if player is already queued for this fee to prevent duplicates
        const existingQueue = await prisma.duelMatch.findFirst({
          where: {
            player1: userAddr,
            entryFee,
            tokenAddress,
            status: "queued"
          }
        });

        if (!existingQueue) {
          await prisma.duelMatch.create({
            data: {
              player1: userAddr,
              entryFee,
              tokenAddress,
              tokenSymbol,
              status: "queued"
            }
          });
        }
      }
    } catch (error) {
      console.error("Socket: Matchmaking error:", error);
    }
  });

  // Client notifies that they submitted their word hash on-chain (committed)
  socket.on("duel:committed", (data: { matchId: number; walletAddress: string }) => {
    const { matchId, walletAddress } = data;
    if (!matchId || !walletAddress) return;

    const userAddr = walletAddress.toLowerCase();
    let mState = activeMatches.get(matchId);

    if (!mState) {
      mState = {
        player1Committed: false,
        player2Committed: false,
        player1Word: "",
        player2Word: ""
      };
      activeMatches.set(matchId, mState);
    }

    console.log(`Socket: Player ${userAddr} committed hash in Match ${matchId}`);

    // Update match state in DB if needed or query
    prisma.duelMatch.findUnique({ where: { id: matchId } }).then(async (match) => {
      if (!match) return;

      if (userAddr === match.player1.toLowerCase()) {
        mState!.player1Committed = true;
      } else if (match.player2 && userAddr === match.player2.toLowerCase()) {
        mState!.player2Committed = true;
      }

      // If both players committed, emit duel:both_committed to start reveal phase
      if (mState!.player1Committed && mState!.player2Committed) {
        console.log(`Socket: Both committed for Match ${matchId}. Revealing start.`);
        
        prisma.duelMatch.update({
          where: { id: matchId },
          data: { status: "committed" }
        }).catch(err => console.error("Socket: Error updating status to committed:", err));

        const s1 = activeSockets.get(match.player1.toLowerCase());
        const s2 = match.player2 ? activeSockets.get(match.player2.toLowerCase()) : undefined;

        if (s1) io.to(s1).emit("duel:both_committed", { matchId });
        if (s2) io.to(s2).emit("duel:both_committed", { matchId });
      }
    });
  });

  // Client reveals their plaintext word to the socket for UI prediction
  socket.on("duel:revealed", (data: { matchId: number; walletAddress: string; word: string }) => {
    const { matchId, walletAddress, word } = data;
    if (!matchId || !walletAddress || !word) return;

    const userAddr = walletAddress.toLowerCase();
    const mState = activeMatches.get(matchId);
    if (!mState) return;

    console.log(`Socket: Player ${userAddr} revealed word "${word}" in Match ${matchId}`);

    prisma.duelMatch.findUnique({ where: { id: matchId } }).then(async (match) => {
      if (!match) return;

      if (userAddr === match.player1.toLowerCase()) {
        mState.player1Word = word.trim().toLowerCase();
      } else if (match.player2 && userAddr === match.player2.toLowerCase()) {
        mState.player2Word = word.trim().toLowerCase();
      }

      // If both have revealed, calculate the winner and notify
      if (mState.player1Word && mState.player2Word) {
        prisma.duelMatch.update({
          where: { id: matchId },
          data: { status: "revealed" }
        }).catch(err => console.error("Socket: Error updating status to revealed:", err));

        const w1 = mState.player1Word;
        const w2 = mState.player2Word;

        const v1 = isValidWord(w1);
        const v2 = isValidWord(w2);

        let winner: "player1" | "player2" | "draw" = "draw";
        let winnerIndex = 3; // draw

        if (v1 && !v2) {
          winner = "player1";
          winnerIndex = 1;
        } else if (!v1 && v2) {
          winner = "player2";
          winnerIndex = 2;
        } else if (v1 && v2) {
          if (w1.length > w2.length) {
            winner = "player1";
            winnerIndex = 1;
          } else if (w2.length > w1.length) {
            winner = "player2";
            winnerIndex = 2;
          } else {
            winner = "draw";
            winnerIndex = 3;
          }
        }

        // Generate backend signature for the contract
        let signature = "0x";
        try {
          const privateKey = process.env.BACKEND_SIGNER_KEY;
          if (privateKey && privateKey !== "0x_YOUR_BACKEND_SIGNER_PRIVATE_KEY_HERE") {
             const wallet = new ethers.Wallet(privateKey);
             const messageHash = ethers.solidityPackedKeccak256(
               ["uint256", "uint8"],
               [match.duelId, winnerIndex]
             );
             signature = await wallet.signMessage(ethers.getBytes(messageHash));
          }
        } catch(e) {
          console.error("Failed to sign duel result:", e);
        }

        console.log(`Socket: Match ${matchId} Result prediction: ${winner} (Word 1: "${w1}" Valid: ${v1}, Word 2: "${w2}" Valid: ${v2})`);

        // Emit duel:result
        const s1 = activeSockets.get(match.player1.toLowerCase());
        const s2 = match.player2 ? activeSockets.get(match.player2.toLowerCase()) : undefined;

        const payload = {
          matchId,
          winner,
          word1: w1,
          word2: w2,
          word1Valid: v1,
          word2Valid: v2,
          signature,
          winnerIndex
        };

        if (s1) io.to(s1).emit("duel:result", payload);
        if (s2) io.to(s2).emit("duel:result", payload);

        // Update status in db to finalized
        prisma.duelMatch.update({
          where: { id: matchId },
          data: { status: "finalized" }
        }).catch(err => console.error("Socket: Error updating status to finalized:", err));

        // Clean up match state
        activeMatches.delete(matchId);
      }
    });
  });

  // Handle socket disconnect
  socket.on("disconnect", () => {
    const userAddr = socketWallets.get(socket.id);
    if (userAddr) {
      console.log(`Socket: Player ${userAddr} disconnected`);
      activeSockets.delete(userAddr);
      socketWallets.delete(socket.id);

      // Remove from queued matches in DB (to prevent stale matching)
      prisma.duelMatch.deleteMany({
        where: {
          player1: userAddr,
          status: "queued"
        }
      }).catch(err => console.error("Socket: Error removing stale queue on disconnect:", err));
    }
  });
}
