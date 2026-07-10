import React, { useState, useEffect, useRef } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useWordPot } from "../../hooks/useWordPot";
import { Loader2 } from "lucide-react";
import { PremiumLoader } from "../layout/PremiumLoader";
import { wordEmoji, scoreForLength } from "../../lib/gameLogic";

import { useApi } from "../../hooks/useApi";
import { formatToken } from "../../lib/formatters";

interface WordPotGameProps {
  roundId: number;
  entryFee: string;
  poolBalance: string;
  playerCount: number;
  currency: "USDT" | "NIM";
  onComplete: (sessionId: string, score: number, proof: string) => void;
  onExit: () => void;
}



export function WordPotGame({ roundId, entryFee, poolBalance, playerCount, currency, onComplete, onExit }: WordPotGameProps) {
  const { walletAddress } = useNimiq();
  const { startSession, submitWord, finalizeSession } = useWordPot();
  const { get } = useApi();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sourceWord, setSourceWord] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [timesUp, setTimesUp] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);
  const [currentInput, setCurrentInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [foundWords, setFoundWords] = useState<{ word: string; len: number }[]>([]);
  const [tileState, setTileState] = useState<"idle" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<{ msg: string; pts: number; type: "success" | "error" } | null>(null);
  const [floatPts, setFloatPts] = useState<{ id: number; pts: number }[]>([]);
  const [floatIdCounter, setFloatIdCounter] = useState(0);

  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [showLeadToast, setShowLeadToast] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  };

  const playSound = (type: "success" | "error") => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  };

  useEffect(() => {
    async function init() {
      if (!walletAddress) return;
      try {
        const data = await startSession(roundId, walletAddress);
        setSessionId(data.sessionId);
        setSourceWord(data.sourceWord);
        setTimeLeft(data.duration || 60);
        setLoading(false);
        initAudio();
      } catch {
        alert("Failed to start session.");
        onExit();
      }
    }
    init();
  }, [roundId, walletAddress]);

  // Timer & Polling
  useEffect(() => {
    if (loading || !sessionId) return;
    
    // Timer
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleTimesUp(); return 0; }
        return prev - 1;
      });
    }, 1000);

    // Leaderboard Polling
    const pollLeaderboard = async () => {
      try {
        const board = await get(`/api/word-pot/session/${roundId}/leaderboard`);
        if (Array.isArray(board) && walletAddress) {
          const myRank = board.findIndex(b => b.walletAddress.toLowerCase() === walletAddress.toLowerCase()) + 1;
          if (myRank > 0) {
            setCurrentRank(prev => {
              // Show toast if we just jumped to #1
              if (prev !== null && prev > 1 && myRank === 1) {
                setShowLeadToast(true);
                setTimeout(() => setShowLeadToast(false), 3000);
              }
              return myRank;
            });
          }
        }
      } catch (err) {
        console.error("Failed to poll leaderboard", err);
      }
    };

    pollLeaderboard(); // Initial poll
    const p = setInterval(pollLeaderboard, 10000); // Poll every 10s

    return () => {
      clearInterval(t);
      clearInterval(p);
    };
  }, [loading, sessionId, roundId, walletAddress, get]);

  // Global keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (loading || isChecking || timeLeft <= 0 || timesUp) return;
      const el = document.getElementById("wp-input") as HTMLInputElement;
      if (!el) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.activeElement !== el) {
        if (/^[a-zA-Z]$/.test(e.key)) {
          el.focus();
          setCurrentInput((p) => (p + e.key).toUpperCase());
          e.preventDefault();
        } else if (e.key === "Backspace") {
          el.focus();
          setCurrentInput((p) => p.slice(0, -1));
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, isChecking, timeLeft, timesUp]);

  const handleTimesUp = async () => {
    setTimesUp(true);
    setLoading(true);
    try {
      const res = await finalizeSession(sessionId!);
      setTimeout(() => onComplete(sessionId!, res.score, res.proof), 1800);
    } catch {
      onExit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() || isChecking || !sessionId || timeLeft <= 0) return;
    const word = currentInput.trim().toUpperCase();
    setIsChecking(true);
    try {
      const res = await submitWord(sessionId, word);
      if (res.valid) {
        playSound("success");
        setTileState("success");
        setScore(res.totalScore);
        const pts = res.scoreAdded ?? scoreForLength(word.length);
        const id = floatIdCounter + 1;
        setFloatIdCounter(id);
        setFloatPts((p) => [...p, { id, pts }]);
        setTimeout(() => setFloatPts((p) => p.filter((x) => x.id !== id)), 1300);
        setFoundWords((p) => [...p, { word, len: word.length }]);
        setFeedback({ msg: `+${pts} Points!`, pts, type: "success" });
        setCurrentInput("");
      } else {
        playSound("error");
        setTileState("error");
        setFeedback({ msg: res.error || "Invalid word", pts: 0, type: "error" });
      }
    } catch {
      playSound("error");
      setTileState("error");
      setFeedback({ msg: "Network error", pts: 0, type: "error" });
    } finally {
      setIsChecking(false);
      setTimeout(() => { setTileState("idle"); setFeedback(null); }, 1500);
    }
  };

  if (loading && !sourceWord) return <PremiumLoader text="Joining Word Pot..." />;

  const timerColor = timeLeft > 19 ? "#F1F1F3" : timeLeft > 9 ? "#F59E0B" : "#EF4444";
  const letterChips = sourceWord.toUpperCase().split("");

  return (
    <div className="pb-24 px-4 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-5 flex flex-col page-fade-in">
      {/* Times Up overlay */}
      {timesUp && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm times-up-flash">
          <div className="text-6xl mb-4">⏱️</div>
          <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            TIME'S UP!
          </h2>
          <p className="text-gray-400 mt-2 text-sm">Calculating your score...</p>
        </div>
      )}

      {/* Banner */}
      <div className="flex flex-col items-center justify-center gap-1 mb-4">
        <div className="bg-[#13131A] border border-[#2B2B3D] px-4 py-1.5 rounded-full text-xs font-bold font-mono text-gray-400">
          🏺 Word Pot — Round #{roundId}
        </div>
        <div className="flex gap-4 text-xs font-bold uppercase tracking-wider mt-1">
          <span className="text-[#F59E0B]">💰 Prize Pool: {formatToken(poolBalance, currency === "USDT" ? 6 : 18)} {currency}</span>
          <span className="text-gray-400">👥 {playerCount} players</span>
        </div>
      </div>

      {showLeadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#10B981] text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-bounce">
          🔥 You're in the lead!
        </div>
      )}

      {/* HUD */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-[#13131A] px-4 py-2.5 rounded-2xl border border-[#1F1F2E]">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: timerColor,
                ...(timeLeft <= 9 ? { animation: "dot-pulse 0.8s ease-in-out infinite" } : {}) }}
            >
              {String(timeLeft).padStart(2, "0")}s
            </span>
          </div>
          {currentRank !== null && (
             <div className="text-[10px] font-bold uppercase text-[#10B981] tracking-wider bg-[#10B981]/10 px-2 py-1 rounded-md text-center border border-[#10B981]/20">
               📊 Your Rank: #{currentRank} of {playerCount}
             </div>
          )}
        </div>

        {/* Score with float-up effect */}
        <div className="relative flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Score</span>
          <span
            className="text-3xl font-extrabold text-[#F59E0B] tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {score}
          </span>
          {floatPts.map(({ id, pts }) => (
            <span
              key={id}
              className="absolute -top-6 right-0 text-[#F59E0B] font-extrabold text-sm score-float pointer-events-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              +{pts}
            </span>
          ))}
        </div>
      </div>

      {/* Letter Tiles */}
      <div className="text-center mb-5">
        <h3 className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest mb-3">
          SOURCE WORD
        </h3>
        <div
          className={`flex flex-wrap gap-2 justify-center p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] shadow-inner ${
            tileState === "success" ? "tile-success" : tileState === "error" ? "tile-error" : ""
          }`}
        >
          {letterChips.map((letter, i) => (
            <div
              key={i}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-[0_4px_12px_rgba(0,0,0,0.4)] select-none transition-all"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: "bold",
                background: "#1E1E2E",
                border: "1px solid #F59E0B",
                minWidth: 40,
                minHeight: 40,
              }}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>

      {/* Input panel */}
      <div className="w-full bg-[#13131A] rounded-2xl p-5 border border-[#1F1F2E] shadow-xl relative overflow-hidden mb-5">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent" />

        {/* Feedback */}
        <div className="h-16 flex items-center justify-center mb-3">
          {feedback && (
            <div
              className={`flex items-center gap-2 font-extrabold text-sm uppercase tracking-widest ${
                feedback.type === "success" ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
              style={{ fontFamily: "'Inter', sans-serif", animation: "page-fade-in 0.2s ease-out" }}
            >
              {feedback.type === "success" ? "✅" : "❌"} {feedback.msg}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="wp-input"
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
            placeholder="TYPE WORD..."
            disabled={isChecking || timeLeft <= 0}
            autoFocus
            className="input-glow w-full bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl px-4 py-4 text-center text-2xl text-white uppercase transition-all disabled:opacity-40"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "0.15em" }}
          />
          <button
            type="submit"
            disabled={!currentInput.trim() || isChecking || timeLeft <= 0}
            className="btn-press bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#1F1F2E] text-white px-5 rounded-xl font-bold flex items-center justify-center transition-colors"
            style={{ minWidth: 56 }}
          >
            {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : "→"}
          </button>
        </form>
      </div>

      {/* Found words */}
      <div className="max-h-[150px] overflow-y-auto bg-[#0A0A0F] rounded-xl p-4 border border-[#1F1F2E]">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          ✅ Words Found ({foundWords.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {foundWords.map(({ word, len }, i) => (
            <span
              key={i}
              className="word-slide-in flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 rounded-lg uppercase"
            >
              {wordEmoji(len)} {word}
            </span>
          ))}
          {foundWords.length === 0 && (
            <span className="text-xs text-gray-600 italic font-mono">No words yet...</span>
          )}
        </div>
      </div>
    </div>
  );
}
export default WordPotGame;
