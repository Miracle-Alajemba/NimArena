import { useCallback, useState } from "react";
import { useApi } from "./useApi";

interface WordPotRound {
  roundId: number;
  tokenAddress: string;
  entryFee: string;
  joinDeadline: number;
  gameStartTime: number;
  gameEndTime: number;
  topScorer: string;
  topScore: number;
  poolBalance: string;
  playerCount: number;
  finalized: boolean;
}

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  score: number;
  wordCount: number;
}

export function useWordPot() {
  const { get, post } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch active Word Pot rounds from the backend. */
  const getRounds = useCallback(async (): Promise<WordPotRound[]> => {
    try {
      const res = await get("/api/word-pot/rounds");
      return res as WordPotRound[];
    } catch (err: any) {
      console.error("useWordPot: getRounds failed:", err);
      return [];
    }
  }, [get]);

  /**
   * Start (or rejoin) a player session for a given Word Pot round.
   * Returns the shared letter set for this round — identical for all players.
   */
  const startSession = useCallback(
    async (roundId: number, walletAddress: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await post("/api/word-pot/session/start", {
          roundId,
          walletAddress: walletAddress.toLowerCase(),
        });
        return res as {
          sessionId: string;
          letters: string;
          duration: number;
          playerCount: number;
        };
      } catch (err: any) {
        setError(err.message || "Failed to start Word Pot session");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [post]
  );

  /** Submit a word for validation and scoring. */
  const submitWord = useCallback(
    async (sessionId: string, word: string) => {
      try {
        const res = await post("/api/word-pot/session/submit-word", { sessionId, word });
        return res as {
          valid: boolean;
          scoreAdded?: number;
          totalScore: number;
          foundWords?: string[];
          error?: string;
        };
      } catch (err: any) {
        console.error("useWordPot: submitWord failed:", err);
        throw err;
      }
    },
    [post]
  );

  /** Finalize the session and receive the backend-signed proof for on-chain submission. */
  const finalizeSession = useCallback(
    async (sessionId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await post("/api/word-pot/session/finalize", { sessionId });
        return res as { score: number; proof: string; foundWords: string[] };
      } catch (err: any) {
        setError(err.message || "Failed to finalize Word Pot session");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [post]
  );

  /** Fetch the round leaderboard (all players sorted by score desc). */
  const getLeaderboard = useCallback(
    async (roundId: number): Promise<LeaderboardEntry[]> => {
      try {
        const res = await get(`/api/word-pot/session/${roundId}/leaderboard`);
        return res as LeaderboardEntry[];
      } catch (err) {
        console.error("useWordPot: getLeaderboard failed:", err);
        return [];
      }
    },
    [get]
  );

  return {
    loading,
    error,
    getRounds,
    startSession,
    submitWord,
    finalizeSession,
    getLeaderboard,
  };
}
export default useWordPot;
