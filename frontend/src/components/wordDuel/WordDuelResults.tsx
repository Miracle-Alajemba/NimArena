import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useContract } from "../../hooks/useContract";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { useNIMBalance } from "../../hooks/useNIMBalance";
import { formatToken } from "../../lib/formatters";
import { NIM_ADDRESS, CONTRACT_ADDRESS, USDT_ADDRESS } from "../../config/constants";
import { Award, CheckCircle, ShieldCheck, ChevronRight } from "lucide-react";
import { publicClient } from "../../lib/viemClient";

interface WordDuelResultsProps {
  roundId: number;
  sessionId: string;
  score: number;
  onExit: () => void;
  onShowRipple: () => void;
}

export function WordDuelResults({ roundId, sessionId, score, onExit, onShowRipple }: WordDuelResultsProps) {
  const { post } = useApi();
  const { submitWordDuelScore, finalizeWordDuel, txLoading, txError } = useContract();
  const { refresh: refreshUSDT } = useUSDTBalance();
  const { refresh: refreshNIM } = useNIMBalance();

  const [proof, setProof] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(true);
  const [isSubmittedOnChain, setIsSubmittedOnChain] = useState(false);
  const [roundEnded, setRoundEnded] = useState(false);
  const [payoutFinalized, setPayoutFinalized] = useState(false);
  const [currency, setCurrency] = useState<"USDT" | "NIM">("USDT");

  // Fetch proof signature on mount
  useEffect(() => {
    async function fetchProof() {
      try {
        const res = await post("/api/word-duel/session/finalize", { sessionId });
        setProof(res.proof);
      } catch (err) {
        console.error("WordDuelResults: Failed to finalize and fetch backend proof:", err);
      } finally {
        setProofLoading(false);
      }
    }

    fetchProof();
  }, [sessionId, post]);

  // Monitor round status on-chain
  useEffect(() => {
    async function checkRoundStatus() {
      if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;

      try {
        const roundData = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: [
            {
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
            },
          ],
          functionName: "getWordDuelRound",
          args: [BigInt(roundId)],
        } as any) as any;

        const token = roundData[1] as string;
        const endTime = Number(roundData[4]);
        const isFinalized = roundData[9] as boolean;
        
        const isNim = token.toLowerCase() === NIM_ADDRESS.toLowerCase();
        setCurrency(isNim ? "NIM" : "USDT");

        const ended = endTime * 1000 <= Date.now();
        setRoundEnded(ended);
        setPayoutFinalized(isFinalized);
      } catch (err) {
        console.error("WordDuelResults: Failed to read round status:", err);
      }
    }

    checkRoundStatus();
    const interval = setInterval(checkRoundStatus, 10_000);
    return () => clearInterval(interval);
  }, [roundId]);

  const refreshBalances = () => {
    if (currency === "NIM") {
      refreshNIM();
    } else {
      refreshUSDT();
    }
  };

  const handleSubmitScore = async () => {
    if (!proof) return;
    try {
      const hash = await submitWordDuelScore(roundId, score, proof as `0x${string}`);
      if (hash) {
        setIsSubmittedOnChain(true);
        refreshBalances();
      }
    } catch (err) {
      console.error("WordDuelResults: Failed to submit score to contract:", err);
    }
  };

  const handleFinalizePayout = async () => {
    try {
      const hash = await finalizeWordDuel(roundId);
      if (hash) {
        setPayoutFinalized(true);
        onShowRipple(); // Trigger global payout visual animation
        refreshBalances();
      }
    } catch (err) {
      console.error("WordDuelResults: Finalize payout failed:", err);
    }
  };

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-6 text-center">
      {/* Trophy Badge */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#A78BFA] mb-6">
        <Award className="w-8 h-8" />
      </div>

      {/* Main headings */}
      <h2 className="text-xl font-extrabold text-white tracking-wide font-display uppercase">
        Word Duel Completed
      </h2>
      <p className="text-xs text-gray-400 mt-1 mb-8">
        Round #{roundId} Session ended successfully
      </p>

      {/* Score Summary Box */}
      <div className="p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 flex flex-col items-center">
        <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
          Your Score
        </span>
        <span className="text-4xl font-extrabold text-[#F59E0B] font-mono mt-1">
          {score}
        </span>
        
        {/* Verification Status */}
        <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wide">
            Backend Verified
          </span>
        </div>
      </div>

      {/* Transaction status errors */}
      {txError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          {txError}
        </div>
      )}

      {/* Submit Proof to Chain (if not submitted) */}
      {!isSubmittedOnChain ? (
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            Submit your score to the blockchain to rank on the active pool. Nimiq Pay will prompt confirmation.
          </p>
          <button
            onClick={handleSubmitScore}
            disabled={proofLoading || !proof || txLoading}
            style={{ minHeight: "52px" }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-sm font-bold uppercase transition-all duration-200 disabled:opacity-50"
          >
            {txLoading || proofLoading ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              "Submit Score on Chain"
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 justify-center py-4 text-[#10B981] font-bold text-sm mb-6">
          <CheckCircle className="w-5 h-5" />
          <span>Score successfully locked on Base!</span>
        </div>
      )}

      {/* Finalize/Claim button at round end */}
      {roundEnded && !payoutFinalized && (
        <div className="p-5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-left mb-6">
          <h4 className="text-sm font-bold text-white mb-1.5">Round Ended!</h4>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            The timer has expired. Call finalize to settle payments and distribute the pot to the top scorer.
          </p>
          <button
            onClick={handleFinalizePayout}
            disabled={txLoading}
            style={{ minHeight: "44px" }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-black text-xs font-extrabold uppercase transition-colors disabled:opacity-50"
          >
            {txLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" />
            ) : (
              "Finalize Round Payout"
            )}
          </button>
        </div>
      )}

      {/* Round finalized confirmation */}
      {payoutFinalized && (
        <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 text-center mb-6">
          <span className="text-xs font-bold text-[#10B981]">
            This round has been finalized and paid out!
          </span>
        </div>
      )}

      {/* Exit Button */}
      <button
        onClick={onExit}
        style={{ minHeight: "44px" }}
        className="w-full flex items-center justify-center gap-1 text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors"
      >
        <span>Return to Lobby</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
export default WordDuelResults;
