import { useCallback, useState } from "react";
import { useApi } from "./useApi";

export function useWordDuel() {
  const { get, post } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (roundId: number, walletAddress: string, difficulty?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await post("/api/word-duel/session/start", {
        roundId,
        walletAddress: walletAddress.toLowerCase(),
        difficulty
      });
      return res as { sessionId: string; letters: string; duration: number };
    } catch (err: any) {
      setError(err.message || "Failed to start Word Duel session");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  const submitWord = useCallback(async (sessionId: string, word: string) => {
    try {
      const res = await post("/api/word-duel/session/submit-word", {
        sessionId,
        word
      });
      return res as { valid: boolean; scoreAdded?: number; totalScore: number; foundWords?: string[]; error?: string };
    } catch (err: any) {
      console.error("useWordDuel: Submit word failed:", err);
      throw err;
    }
  }, [post]);

  const finalizeSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await post("/api/word-duel/session/finalize", {
        sessionId
      });
      return res as { score: number; proof: string; foundWords: string[] };
    } catch (err: any) {
      setError(err.message || "Failed to finalize Word Duel session");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  return {
    loading,
    error,
    startSession,
    submitWord,
    finalizeSession
  };
}
export default useWordDuel;
