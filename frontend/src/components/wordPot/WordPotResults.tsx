import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useContract } from "../../hooks/useContract";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { useNIMBalance } from "../../hooks/useNIMBalance";
import { NIM_ADDRESS, CONTRACT_ADDRESS } from "../../config/constants";
import { CheckCircle, ShieldCheck, ChevronRight, Users } from "lucide-react";
import { publicClient } from "../../lib/viemClient";
import { Confetti } from "../layout/Confetti";
import { useWordPot } from "../../hooks/useWordPot";

interface WordPotResultsProps {
  roundId: number;
  sessionId: string;
  score: number;
  onExit: () => void;
  onShowRipple: () => void;
}

export function WordPotResults({ roundId, sessionId, score, onExit, onShowRipple }: WordPotResultsProps) {
  const { post } = useApi();
  const { getLeaderboard } = useWordPot();
  const { submitWordPotScore, finalizeWordPot, txLoading, txError } = useContract();
  const { refresh: refreshUSDT } = useUSDTBalance();
  const { refresh: refreshNIM } = useNIMBalance();

  const [proof, setProof] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(true);
  const [isSubmittedOnChain, setIsSubmittedOnChain] = useState(false);
  const [roundEnded, setRoundEnded] = useState(false);
  const [payoutFinalized, setPayoutFinalized] = useState(false);
  const [currency, setCurrency] = useState<"USDT" | "NIM">("USDT");
  const [showRipple, setShowRipple] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  useEffect(() => {
    async function fetchProof() {
      try {
        const res = await post("/api/word-pot/session/finalize", { sessionId });
        setProof(res.proof);
      } catch (err) {
        console.error("WordPotResults: Proof fetch failed:", err);
      } finally {
        setProofLoading(false);
      }
    }
    fetchProof();
  }, [sessionId, post]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const data = await getLeaderboard(roundId);
      setLeaderboard(data);
      // Optional: highlight the player's rank if you know their wallet
      // but we can infer rank from the fetched leaderboard.
    }
    fetchLeaderboard();
    const i = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(i);
  }, [roundId, getLeaderboard]);

  useEffect(() => {
    async function checkStatus() {
      if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
      try {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: [{ name: "getWordPotRound", type: "function", stateMutability: "view",
            inputs: [{ name: "potId", type: "uint256" }],
            outputs: [
              { name: "creator", type: "address" }, { name: "token", type: "address" },
              { name: "entryFee", type: "uint256" }, { name: "joinDeadline", type: "uint64" },
              { name: "gameStartTime", type: "uint64" }, { name: "gameEndTime", type: "uint64" },
              { name: "topScorer", type: "address" }, { name: "topScore", type: "uint256" },
              { name: "poolBalance", type: "uint256" }, { name: "playerCount", type: "uint256" },
              { name: "finalized", type: "bool" },
            ],
          }],
          functionName: "getWordPotRound",
          args: [BigInt(roundId)],
        } as any) as any;
        setCurrency((data[1] as string).toLowerCase() === NIM_ADDRESS.toLowerCase() ? "NIM" : "USDT");
        setRoundEnded(Number(data[5]) * 1000 <= Date.now());
        setPayoutFinalized(data[10] as boolean);
      } catch {}
    }
    checkStatus();
    const i = setInterval(checkStatus, 5000);
    return () => clearInterval(i);
  }, [roundId]);

  const refreshBalances = () => currency === "NIM" ? refreshNIM() : refreshUSDT();

  const handleSubmitScore = async () => {
    if (!proof) return;
    try {
      const hash = await submitWordPotScore(roundId, score, proof as `0x${string}`);
      if (hash) { setIsSubmittedOnChain(true); refreshBalances(); }
    } catch {}
  };

  const handleFinalizePayout = async () => {
    try {
      const hash = await finalizeWordPot(roundId);
      if (hash) {
        setPayoutFinalized(true);
        setShowConfetti(true);
        setShowRipple(true);
        onShowRipple();
        refreshBalances();
        setTimeout(() => setShowRipple(false), 2000);
      }
    } catch {}
  };

  const handleShare = async () => {
    const text = `I scored ${score} points in Word Pot on NimArena! 🏺 Same letters, better words 😤 #NimArena #WordPot #Cycle1`;
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-6 text-center page-fade-in">
      <Confetti active={showConfetti} />

      {/* Trophy badge */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#FBBF24] mb-5">
        <span className="text-4xl">🏺</span>
        {showRipple && <div className="gold-ripple" />}
      </div>

      <h2 className="text-2xl font-extrabold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Word Pot Complete
      </h2>
      <p className="text-xs text-gray-400 mb-8">Round #{roundId} · Session ended</p>

      {/* Score box */}
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

      {/* Live Leaderboard Snippet */}
      <div className="bg-[#13131A] rounded-2xl p-4 border border-[#1F1F2E] mb-6 text-left">
        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#F59E0B]" /> Live Leaderboard
        </h3>
        <div className="flex flex-col gap-2">
          {leaderboard.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No scores submitted yet...</p>
          ) : (
            leaderboard.slice(0, 5).map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-[#0A0A0F] border border-[#1F1F2E]">
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold w-5 text-center ${idx === 0 ? "text-[#F59E0B]" : "text-gray-400"}`}>
                    #{entry.rank}
                  </span>
                  <span className="text-gray-300 font-mono">
                    {entry.walletAddress.substring(0, 6)}...{entry.walletAddress.substring(38)}
                  </span>
                </div>
                <span className="font-mono text-[#10B981] font-bold">{entry.score} pts</span>
              </div>
            ))
          )}
        </div>
      </div>

      {txError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          ❌ {txError}
        </div>
      )}

      {/* Submit on-chain */}
      {!isSubmittedOnChain ? (
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            Submit your score to the blockchain to rank on the prize pool.
          </p>
          <button
            onClick={handleSubmitScore}
            disabled={proofLoading || !proof || txLoading || isSubmittedOnChain}
            style={{ minHeight: 52 }}
            className="btn-press w-full flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50"
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

      {/* Finalize payout */}
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

      {/* Share + Exit */}
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
export default WordPotResults;
