import React, { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { useNimiq } from "../../hooks/useNimiq";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { Timer, Check, AlertCircle, Award, CheckCircle, ChevronLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { formatUSDT } from "../../lib/formatters";

interface DailyWordPotGameProps {
  onExit: () => void;
  onShowRipple: () => void;
}

export function DailyWordPotGame({ onExit, onShowRipple }: DailyWordPotGameProps) {
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
        const res = await get(`/api/word-pot/daily/letters?walletAddress=${walletAddress.toLowerCase()}`);
        
        setSessionId(res.sessionId);
        setSourceWord(res.sourceWord.toUpperCase());
        setTargetScore(50);
        setRewardAmount("1.00");
        
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
        setErrorMsg(err.message || "Failed to start daily challenge. Cooldown may be active.");
      } finally {
        setLoading(false);
      }
    }
    
    startSession();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [walletAddress, get]);

  // Listen to keys globally to auto-focus and input text
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (loading || claiming) return;
      const inputEl = document.getElementById("wp-daily-input") as HTMLInputElement;
      if (!inputEl) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      if (document.activeElement !== inputEl) {
        if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
          inputEl.focus();
          setCurrentInput((prev) => (prev + e.key).toUpperCase());
          e.preventDefault();
        } else if (e.key === "Backspace") {
          inputEl.focus();
          setCurrentInput((prev) => prev.slice(0, -1));
          e.preventDefault();
        } else if (e.key === "Enter") {
          inputEl.focus();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [loading, claiming]);

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !currentInput.trim()) return;
    
    setErrorMsg(null);
    setSuccessMsg(null);
    const wordToSubmit = currentInput.trim().toLowerCase();
    
    try {
      const res = await post("/api/word-pot/daily/submit-word", {
        sessionId,
        word: wordToSubmit,
      });
      
      setFoundWords((prev) => [...prev, { word: res.word, score: res.scoreAdded }]);
      setScore(res.totalScore);
      setSuccessMsg(`+${res.scoreAdded} pts: "${res.word.toUpperCase()}" added!`);
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
      const res = await post("/api/word-pot/daily/claim", {
        sessionId,
        walletAddress: walletAddress.toLowerCase(),
      });
      
      if (res.success && res.txHash) {
        setClaimHash(res.txHash);
        refreshBalance();
        onShowRipple();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to claim reward. Try again.");
    } finally {
      setClaiming(false);
    }
  };

  // Convert timer
  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);
  const progressPercent = Math.min(100, Math.round((score / targetScore) * 100));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#F59E0B] animate-spin mb-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Loading Daily Letters...</span>
      </div>
    );
  }

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4 page-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onExit} className="p-2 rounded-full bg-[#1A1A24] text-gray-400 hover:text-white transition-colors border border-[#2B2B3D]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏺</span>
          <h2 className="text-xl font-extrabold tracking-wide text-white font-display uppercase">
            Daily Pot
          </h2>
        </div>
      </div>

      {claimHash ? (
        <div className="p-8 rounded-2xl bg-[#13131A] border border-[#10B981]/50 text-center shadow-[0_0_40px_rgba(16,185,129,0.15)] mt-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#10B981]/10 to-transparent pointer-events-none" />
          <CheckCircle className="w-16 h-16 text-[#10B981] mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2 font-display uppercase tracking-wider">Reward Claimed!</h3>
          <p className="text-gray-400 mb-6 text-sm">
            {rewardAmount} USDT has been sent to your Nimiq Pay wallet.
          </p>
          <div className="p-4 bg-[#0A0A0F] rounded-xl border border-[#1F1F2E] mb-6 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Transaction Hash</span>
            <a 
              href={`https://sepolia.basescan.org/tx/${claimHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#10B981] text-xs font-mono break-all hover:underline"
            >
              {claimHash}
            </a>
          </div>
          <button
            onClick={onExit}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold uppercase transition-all"
          >
            Back to Word Pot
          </button>
        </div>
      ) : (
        <>
          {/* Top Banner */}
          <div className="w-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl py-2 px-4 mb-6 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[#F59E0B] text-xs font-bold uppercase tracking-widest">
              Today's Shared Letters
            </span>
          </div>

          {/* Info Card */}
          <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col text-center md:text-left">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Target Score</span>
              <div className="text-2xl font-bold text-white flex items-baseline gap-1 justify-center md:justify-start">
                <span className="text-[#F59E0B]">{score}</span>
                <span className="text-lg text-gray-500">/ {targetScore}</span>
              </div>
            </div>

            <div className="flex flex-col text-center md:text-right">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-center md:justify-end gap-1">
                <Timer className="w-3.5 h-3.5" /> Time Left
              </span>
              <div className={`text-2xl font-mono font-bold ${timeLeftMs <= 60000 ? 'text-[#EF4444]' : 'text-[#F1F1F3]'}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-[#1A1A24] rounded-full overflow-hidden border border-[#2B2B3D]">
              <div 
                className="h-full bg-gradient-to-r from-[#F59E0B] to-[#10B981] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Game Area */}
          {score < targetScore ? (
            <div className="flex flex-col gap-4">
              <div className="p-6 rounded-2xl bg-[#1A1A24] border border-[#2B2B3D] shadow-xl text-center">
                <h3 className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest mb-3">
                  SOURCE WORD
                </h3>
                
                <div className="flex flex-wrap gap-2 justify-center p-4 rounded-2xl bg-[#13131A] border border-[#1F1F2E] shadow-inner mb-6">
                  {sourceWord.toUpperCase().split("").map((letter, i) => {
                    const usedInInput = (currentInput.match(new RegExp(letter, "gi")) || []).length;
                    const availableInSource = (sourceWord.match(new RegExp(letter, "gi")) || []).length;
                    const isUsed = usedInInput >= availableInSource;
                    
                    return (
                      <div
                        key={i}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.4)] select-none
                          ${isUsed ? "bg-[#1A1A24] text-gray-600 border border-[#2B2B3D]" : "bg-[#1E1E2E] text-white border border-[#F59E0B]"}`}
                        style={{ fontFamily: "'Syne', sans-serif", fontWeight: "bold", minWidth: 40, minHeight: 40 }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
                
                <form onSubmit={handleSubmitWord} className="flex gap-2">
                  <input
                    id="wp-daily-input"
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
                    placeholder="TYPE WORD..."
                    className="w-full bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl px-4 py-4 text-center text-xl text-white uppercase font-bold font-mono transition-all focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] outline-none"
                    disabled={timeLeftMs <= 0}
                  />
                  <button
                    type="submit"
                    disabled={!currentInput.trim() || timeLeftMs <= 0}
                    className="bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#1F1F2E] disabled:text-gray-600 text-white px-5 rounded-xl font-bold flex items-center justify-center transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>

                {/* Feedback messages */}
                <div className="h-8 mt-4 flex items-center justify-center">
                  {errorMsg && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#EF4444] bg-[#EF4444]/10 px-3 py-1.5 rounded-lg border border-[#EF4444]/20 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                    </span>
                  )}
                  {successMsg && !errorMsg && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-3 py-1.5 rounded-lg border border-[#10B981]/20 animate-fade-in">
                      <Check className="w-3.5 h-3.5" /> {successMsg}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-[#13131A] border border-[#1F1F2E]">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Found Words ({foundWords.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {foundWords.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A24] border border-[#2B2B3D] text-xs">
                      <span className="text-gray-300 font-bold uppercase">{f.word}</span>
                      <span className="text-[#10B981] font-mono">+{f.score}</span>
                    </div>
                  ))}
                  {foundWords.length === 0 && (
                    <span className="text-xs text-gray-600 italic">No words found yet.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#1A1A24] border border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.15)] text-center animate-fade-in">
              <Award className="w-16 h-16 text-[#F59E0B] mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-white mb-2 font-display uppercase tracking-wider">Target Reached!</h3>
              <p className="text-gray-400 mb-8 text-sm">
                You found enough words and earned {rewardAmount} USDT!
              </p>
              
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-bold text-center">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleClaimReward}
                disabled={claiming}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:bg-[#10B981]/50 text-white text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/40"
              >
                {claiming ? (
                  <>
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    Claiming On-Chain...
                  </>
                ) : (
                  <>
                    <Award className="w-5 h-5" /> Claim {rewardAmount} USDT Reward
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
