import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useContract } from "../../hooks/useContract";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { CheckCircle, ShieldCheck, ChevronRight } from "lucide-react";
import { publicClient } from "../../lib/viemClient";
import { CONTRACT_ADDRESS } from "../../config/constants";
import { Confetti } from "../layout/Confetti";

interface TriviaResultsProps {
  roundId: number;
  sessionId: string;
  score: number;
  onExit: () => void;
  onShowRipple: () => void;
}

export function TriviaResults({ roundId, sessionId, score, onExit, onShowRipple }: TriviaResultsProps) {
  const { post } = useApi();
  const { submitTriviaScore, finalizeTrivia, txLoading, txError } = useContract();
  const { refresh: refreshBalance } = useUSDTBalance();

  const [proof, setProof] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(true);
  const [isSubmittedOnChain, setIsSubmittedOnChain] = useState(false);
  const [roundEnded, setRoundEnded] = useState(false);
  const [payoutFinalized, setPayoutFinalized] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProof() {
      try {
        const res = await post(`/api/trivia/session/${sessionId}/submit`);
        setProof(res.proof);
      } catch {}
      finally { setProofLoading(false); }
    }
    fetchProof();
  }, [sessionId]);

  useEffect(() => {
    async function checkStatus() {
      if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
      try {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: [{ name: "getTriviaRound", type: "function", stateMutability: "view",
            inputs: [{ name: "roundId", type: "uint256" }],
            outputs: [
              { name: "creator", type: "address" }, { name: "fee", type: "uint256" },
              { name: "startTime", type: "uint64" }, { name: "endTime", type: "uint64" },
              { name: "topScorer", type: "address" }, { name: "topScore", type: "uint256" },
              { name: "poolBalance", type: "uint256" }, { name: "playerCount", type: "uint256" },
              { name: "finalized", type: "bool" },
            ],
          }],
          functionName: "getTriviaRound",
          args: [BigInt(roundId)],
        } as any) as any;
        setRoundEnded(Number(data[3]) * 1000 <= Date.now());
        setPayoutFinalized(data[8] as boolean);
      } catch {}
    }
    checkStatus();
    const i = setInterval(checkStatus, 10_000);
    return () => clearInterval(i);
  }, [roundId]);

  const handleSubmitScore = async () => {
    if (!proof) return;
    try {
      const hash = await submitTriviaScore(roundId, score, proof as `0x${string}`);
      if (hash) { setIsSubmittedOnChain(true); refreshBalance(); }
    } catch {}
  };

  const handleFinalizePayout = async () => {
    try {
      const hash = await finalizeTrivia(roundId);
      if (hash) {
        setPayoutFinalized(true);
        setShowConfetti(true);
        setShowRipple(true);
        onShowRipple();
        refreshBalance();
        setTimeout(() => setShowRipple(false), 2000);
      }
    } catch {}
  };

  const handleShare = async () => {
    const text = `I scored ${score} points in Speed Trivia on NimArena! ⚡🏆 #NimArena #Cycle1`;
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-6 text-center page-fade-in">
      <Confetti active={showConfetti} />

      {/* Badge */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 mb-5">
        <span className="text-4xl">⚡</span>
        {showRipple && <div className="gold-ripple" />}
      </div>

      <h2 className="text-2xl font-extrabold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Trivia Complete
      </h2>
      <p className="text-xs text-gray-400 mb-8">Round #{roundId} · 10 questions answered</p>

      {/* Score */}
      <div className="p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 flex flex-col items-center">
        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Your Score</span>
        <span className="text-5xl font-extrabold text-[#F59E0B] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {score}
        </span>
        <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Backend Verified</span>
        </div>
      </div>

      {txError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          ❌ {txError}
        </div>
      )}

      {!isSubmittedOnChain ? (
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            Submit your score to the blockchain to rank on the active pool.
          </p>
          <button
            onClick={handleSubmitScore}
            disabled={proofLoading || !proof || txLoading}
            style={{ minHeight: 52 }}
            className="btn-press w-full flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {txLoading || proofLoading
              ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
              : "⛓️ Submit Score On-Chain"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 justify-center py-4 text-[#10B981] font-bold text-sm mb-6">
          <CheckCircle className="w-5 h-5" /> Score locked on Base! ✅
        </div>
      )}

      {roundEnded && !payoutFinalized && (
        <div className="p-5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-left mb-6">
          <h4 className="text-sm font-bold text-white mb-1.5">🏁 Round Ended!</h4>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Finalize to distribute the prize pot to the top scorer.
          </p>
          <button
            onClick={handleFinalizePayout}
            disabled={txLoading}
            style={{ minHeight: 44 }}
            className="btn-press w-full flex items-center justify-center rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-black text-xs font-extrabold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {txLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" /> : "💰 Finalize Round Payout"}
          </button>
        </div>
      )}

      {payoutFinalized && (
        <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 text-center mb-6">
          <span className="text-xs font-bold text-[#10B981]">✅ Round finalized and paid out!</span>
        </div>
      )}

      <button
        onClick={handleShare}
        className="btn-press w-full mb-3 py-3 rounded-xl bg-[#1F1F2E] hover:bg-gray-800 text-gray-300 font-bold text-xs uppercase tracking-widest border border-gray-700 transition-colors"
      >
        {copied ? "✅ Copied!" : "📋 Share Result"}
      </button>
      <button
        onClick={onExit}
        style={{ minHeight: 44 }}
        className="btn-press w-full flex items-center justify-center gap-1 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
      >
        Return to Lobby <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
export default TriviaResults;
