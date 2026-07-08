import React, { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { useNimiq } from "../../hooks/useNimiq";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { Flame, Timer, Check, AlertCircle, Award, CheckCircle, ChevronLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { formatUSDT } from "../../lib/formatters";

interface DailyChallengeGameProps {
  onComplete: () => void;
  onExit: () => void;
  onShowRipple: () => void;
}

export function DailyChallengeGame({ onComplete, onExit, onShowRipple }: DailyChallengeGameProps) {
  const { post, get } = useApi();
  const { walletAddress } = useNimiq();
  const { refresh: refreshBalance } = useUSDTBalance();

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sourceWord, setSourceWord] = useState<string>("");
  const [targetScore, setTargetScore] = useState<number>(50);
  const [rewardAmount, setRewardAmount] = useState<string>("1.00");
  const [expiresAt, setExpiresAt] = useState<number>(0);

  // Game state
  const [currentInput, setCurrentInput] = useState<string>("");
  const [foundWords, setFoundWords] = useState<Array<{ word: string; score: number }>>([]);
  const [score, setScore] = useState<number>(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(900000); // 15 mins
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Claim/Payout state
  const [claiming, setClaiming] = useState(false);
  const [claimHash, setClaimHash] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Start Session on Mount
  useEffect(() => {
    async function startSession() {
      if (!walletAddress) return;
      setLoading(true);
      setErrorMsg(null);
      
      try {
        const res = await post("/api/daily/start", {
          walletAddress: walletAddress.toLowerCase(),
        });
        
        setSessionId(res.sessionId);
        setSourceWord(res.sourceWord.toUpperCase());
        setTargetScore(res.targetScore);
        setRewardAmount(res.rewardAmount);
        
        const expiry = new Date(res.expiresAt).getTime();
        setExpiresAt(expiry);
        
        const remaining = Math.max(0, expiry - Date.now());
        setTimeLeftMs(remaining);
        
        // Start countdown
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const rem = Math.max(0, expiry - Date.now());
          setTimeLeftMs(rem);
          if (rem <= 0) {
            clearInterval(timerRef.current);
          }
        }, 1000);
      } catch (err: any) {
        console.error("DailyChallenge: Start failed:", err);
        setErrorMsg(err.message || "Failed to start daily challenge. Verify your database and backend are running.");
      } finally {
        setLoading(false);
      }
    }
    
    startSession();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [walletAddress]);

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !currentInput.trim()) return;
    
    setErrorMsg(null);
    setSuccessMsg(null);
    const wordToSubmit = currentInput.trim().toLowerCase();
    
    try {
      const res = await post("/api/daily/submit", {
        sessionId,
        word: wordToSubmit,
      });
      
      setFoundWords((prev) => [...prev, { word: res.word, score: res.score }]);
      setScore(res.totalScore);
      setSuccessMsg(`+${res.score} pts: "${res.word.toUpperCase()}" added!`);
      setCurrentInput("");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid word");
    }
  };

  const handleClaimReward = async () => {
    if (!sessionId || !walletAddress || score < targetScore) return;
    
    setClaiming(true);
    setErrorMsg(null);
    
    try {
      const res = await post("/api/daily/claim", {
        sessionId,
        walletAddress: walletAddress.toLowerCase(),
      });
      
      setClaimHash(res.txHash);
      onShowRipple(); // Trigger global USDT ripple
      refreshBalance();
    } catch (err: any) {
      console.error("DailyChallenge: Claim failed:", err);
      setErrorMsg(err.message || "Claim transaction failed. Try again later.");
    } finally {
      setClaiming(false);
    }
  };

  // Format countdown minutes/seconds
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  // Build unique letters array to display as cards
  const letters = sourceWord.split("");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
        <span className="text-sm font-extrabold uppercase tracking-wider">Loading Daily Anagram...</span>
      </div>
    );
  }

  if (claimHash) {
    return (
      <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-10 text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] flex items-center justify-center mb-6 animate-bounce">
          <Award className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-extrabold text-white tracking-wide font-display uppercase">
          Reward Disbursed!
        </h2>
        <p className="text-sm text-gray-400 mt-2 mb-8 leading-relaxed">
          You scored <span className="text-[#10B981] font-bold">{score} points</span>. Daily reward of <span className="text-[#F59E0B] font-bold">{rewardAmount} USDT</span> was sent to your wallet.
        </p>

        {/* Transaction Proof */}
        <div className="w-full p-4 rounded-xl bg-[#13131A] border border-[#1F1F2E] mb-8 text-left">
          <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
            Transaction Hash
          </span>
          <div className="text-xs text-gray-300 font-mono mt-1 break-all overflow-hidden bg-black/40 p-2.5 rounded-lg border border-[#2B2B3D]">
            {claimHash}
          </div>
          
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#10B981] font-bold uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            <span>Paid via Base Sepolia Contract</span>
          </div>
        </div>

        <button
          onClick={onComplete}
          style={{ minHeight: "48px" }}
          className="w-full rounded-xl bg-[#10B981] hover:bg-[#34D399] text-white text-xs font-extrabold uppercase transition-colors"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  const isGoalReached = score >= targetScore;
  const progressPercent = Math.min(100, (score / targetScore) * 100);

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4 flex flex-col">
      {/* Header back */}
      <button
        onClick={onExit}
        className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors mb-4 uppercase font-bold"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Lobby
      </button>

      {/* Target pool & timer bar */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-[#7C3AED]" />
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider font-display">
            Daily Anagram
          </h2>
        </div>
        
        {/* Expiry count */}
        <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
          <Timer className="w-4 h-4 text-[#EF4444]" />
          <span>{formatTime(timeLeftMs)} remaining</span>
        </div>
      </div>

      {/* Alert details */}
      {errorMsg && (
        <div className="p-3.5 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 mb-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs text-[#10B981] font-bold flex gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Letters Panel */}
      <div className="flex flex-wrap justify-center gap-2.5 p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 shadow-inner">
        {letters.map((letter, idx) => (
          <div
            key={idx}
            className="w-10 h-10 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex items-center justify-center font-extrabold text-white text-base font-display shadow-md shadow-black/30"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Score progress details */}
      <div className="flex justify-between items-end mb-2 text-xs font-extrabold uppercase tracking-wide">
        <span className="text-gray-500">Anagram Score</span>
        <span className="text-[#F59E0B] font-mono">
          {score} / {targetScore} pts
        </span>
      </div>
      <div className="w-full bg-[#1A1A24] h-2.5 rounded-full overflow-hidden mb-6 border border-[#2B2B3D]">
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full transition-all duration-300 ${
            isGoalReached ? "bg-[#10B981]" : "bg-[#7C3AED]"
          }`}
        />
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmitWord} className="flex gap-2.5 mb-6">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
          placeholder="TYPE WORD..."
          style={{ minHeight: "46px" }}
          disabled={claiming}
          className="flex-1 rounded-xl bg-[#13131A] border border-[#1F1F2E] px-4 text-sm font-extrabold uppercase tracking-widest text-white focus:outline-none focus:border-[#7C3AED] font-mono"
        />
        <button
          type="submit"
          disabled={claiming}
          style={{ minHeight: "46px" }}
          className="px-5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-extrabold uppercase transition-all shrink-0"
        >
          Submit
        </button>
      </form>

      {/* Claim box */}
      {isGoalReached && (
        <div className="p-4 mb-6 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex flex-col items-center gap-3">
          <span className="text-xs text-gray-300 font-bold text-center leading-relaxed">
            Target reached! Claim your daily reward of <span className="text-[#10B981] font-extrabold font-mono">{rewardAmount} USDT</span> now.
          </span>
          <button
            onClick={handleClaimReward}
            disabled={claiming}
            style={{ minHeight: "46px" }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-white text-xs font-extrabold uppercase tracking-wide transition-colors"
          >
            {claiming ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              "Claim Daily Reward"
            )}
          </button>
        </div>
      )}

      {/* Found words history */}
      <div className="flex-1 min-h-[150px]">
        <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">
          Words Found ({foundWords.length})
        </h3>
        
        {foundWords.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-600 border border-dashed border-[#1F1F2E] rounded-xl bg-[#13131A]/10">
            Build valid sub-words using the letters above
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
            {foundWords.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center px-3.5 py-2.5 rounded-xl bg-[#13131A] border border-[#1F1F2E] text-xs font-mono text-gray-300"
              >
                <span className="uppercase font-bold tracking-widest">{item.word}</span>
                <span className="text-[#10B981] font-bold">+{item.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default DailyChallengeGame;
