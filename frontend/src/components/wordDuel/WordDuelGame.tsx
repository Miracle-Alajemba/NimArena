import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useWordDuel } from "../../hooks/useWordDuel";
import { Loader2 } from "lucide-react";
import { PremiumLoader } from "../layout/PremiumLoader";

interface WordDuelGameProps {
  roundId: number;
  entryFee: string;
  onComplete: (sessionId: string, score: number, proof: string) => void;
  onExit: () => void;
}

function wordEmoji(len: number) {
  if (len <= 4) return "👍";
  if (len <= 6) return "🔥";
  return "🏆";
}

function scoreForLength(len: number) {
  if (len === 3) return 3;
  if (len === 4) return 4;
  if (len === 5) return 6;
  if (len === 6) return 9;
  return 12;
}

export function WordDuelGame({ roundId, entryFee, onComplete, onExit }: WordDuelGameProps) {
  const { walletAddress } = useNimiq();
  const { startSession, submitWord, finalizeSession } = useWordDuel();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [letters, setLetters] = useState<string>("");
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
        const data = await startSession(roundId, walletAddress, "medium");
        setSessionId(data.sessionId);
        setLetters(data.letters);
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

  // Timer
  useEffect(() => {
    if (loading || !sessionId) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleTimesUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loading, sessionId]);

  // Global keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (loading || isChecking || timeLeft <= 0 || timesUp) return;
      const el = document.getElementById("wd-input") as HTMLInputElement;
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

  if (loading && !letters) return <PremiumLoader text="Generating letter set..." />;

  const timerColor = timeLeft > 19 ? "#F1F1F3" : timeLeft > 9 ? "#F59E0B" : "#EF4444";
  const letterChips = letters.toUpperCase().split("");

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

      {/* HUD */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 bg-[#13131A] px-4 py-2.5 rounded-2xl border border-[#1F1F2E]">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: timerColor,
              ...(timeLeft <= 9 ? { animation: "dot-pulse 0.8s ease-in-out infinite" } : {}) }}
          >
            {String(timeLeft).padStart(2, "0")}s
          </span>
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
      <div
        className={`flex flex-wrap gap-2 justify-center mb-5 p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] shadow-inner ${
          tileState === "success" ? "tile-success" : tileState === "error" ? "tile-error" : ""
        }`}
      >
        {letterChips.map((letter, i) => (
          <div
            key={i}
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.4)] select-none transition-all"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: "#1E1E2E",
              border: "1px solid #7C3AED",
              minWidth: 56,
              minHeight: 56,
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Input panel */}
      <div className="w-full bg-[#13131A] rounded-2xl p-5 border border-[#1F1F2E] shadow-xl relative overflow-hidden mb-5">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent" />

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
            id="wd-input"
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
            className="btn-press bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#1F1F2E] text-white px-5 rounded-xl font-bold flex items-center justify-center transition-colors"
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
export default WordDuelGame;
