import React, { useState, useEffect, useRef } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useWordDuel } from "../../hooks/useWordDuel";
import { Loader2, Sword, Trophy, ArrowLeft, Timer, Zap, Target, Play, HelpCircle } from "lucide-react";
import { PremiumLoader } from "../layout/PremiumLoader";
import { wordEmoji } from "../../lib/gameLogic";

interface WordDuelPracticeProps {
  onExit: () => void;
  onChallengeReal: () => void;
}



export function WordDuelPractice({ onExit, onChallengeReal }: WordDuelPracticeProps) {
  const { walletAddress } = useNimiq();
  const { startSession, submitWord, finalizeSession } = useWordDuel();

  const [phase, setPhase] = useState<"lobby" | "playing" | "over">("lobby");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [letters, setLetters] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentWord, setCurrentWord] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [foundWords, setFoundWords] = useState<{ word: string; len: number }[]>([]);
  const [longestWord, setLongestWord] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [floatEmojis, setFloatEmojis] = useState<{ id: number; emoji: string; pts: number }[]>([]);
  const [eidCounter, setEidCounter] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  };

  const playSound = (type: "success" | "error" | "best") => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const play = (freq: number[], dur: number) => {
      freq.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + dur);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + dur);
      });
    };

    if (type === "best") play([523, 659, 784], 0.25);
    else if (type === "success") play([523, 1046], 0.2);
    else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.value = 150;
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  };

  const startGame = async () => {
    initAudio();
    setLoading(true);
    try {
      const addr = walletAddress || "0x0000000000000000000000000000000000000000";
      const data = await startSession(0, addr, "medium");
      setSessionId(data.sessionId);
      setLetters(data.letters);
      setTimeLeft(data.duration || 60);
      setScore(0); setFoundWords([]); setLongestWord(""); setCurrentWord("");
      setPhase("playing");
    } catch (err) {
      console.warn("WordDuelPractice: API start failed, loading practice fallback letters:", err);
      const fallbackLetters = "NIMIQUARENA";
      setSessionId(`practice_fallback_${Date.now()}`);
      setLetters(fallbackLetters);
      setTimeLeft(60);
      setScore(0); setFoundWords([]); setLongestWord(""); setCurrentWord("");
      setPhase("playing");
    } finally { setLoading(false); }
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing" || !sessionId) return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) { clearInterval(t); endGame(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, sessionId]);

  // Global keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "playing" || isChecking || timeLeft <= 0) return;
      const el = document.getElementById("word-input-field") as HTMLInputElement;
      if (!el || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.activeElement !== el) {
        if (/^[a-zA-Z]$/.test(e.key)) { el.focus(); setCurrentWord((p) => (p + e.key).toUpperCase()); e.preventDefault(); }
        else if (e.key === "Backspace") { el.focus(); setCurrentWord((p) => p.slice(0, -1)); e.preventDefault(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, isChecking, timeLeft]);

  const endGame = async () => {
    setPhase("over");
    if (sessionId) { try { await finalizeSession(sessionId); } catch {} }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord.trim() || isChecking || !sessionId || phase !== "playing") return;
    const word = currentWord.trim().toUpperCase();
    setIsChecking(true);
    try {
      const res = await submitWord(sessionId, word);
      if (res.valid) {
        const isBest = word.length > longestWord.length;
        playSound(isBest ? "best" : "success");
        if (isBest) setLongestWord(word);
        setScore(res.totalScore);
        if (res.foundWords) {
          setFoundWords(res.foundWords.map((w: string) => ({ word: w, len: w.length })));
        } else {
          setFoundWords((p) => [...p, { word, len: word.length }]);
        }
        const emoji = wordEmoji(word.length);
        const pts = res.scoreAdded ?? 0;
        const id = eidCounter + 1;
        setEidCounter(id);
        setFloatEmojis((p) => [...p, { id, emoji, pts }]);
        setTimeout(() => setFloatEmojis((p) => p.filter((x) => x.id !== id)), 1200);
        setFeedback({ msg: `+${pts} pts! ${emoji}`, type: "success" });
        setCurrentWord("");
      } else {
        playSound("error");
        setFeedback({ msg: res.error || "Invalid word", type: "error" });
      }
    } catch { playSound("error"); setFeedback({ msg: "Network error", type: "error" }); }
    finally {
      setIsChecking(false);
      setTimeout(() => setFeedback(null), 1400);
    }
  };

  const timerColor = timeLeft > 19 ? "#F1F1F3" : timeLeft > 9 ? "#F59E0B" : "#EF4444";
  const letterChips = letters.toUpperCase().split("");

  // ---- LOBBY ----
  if (phase === "lobby") return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-6 px-4 page-fade-in pb-24">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onExit}
          className="p-2 rounded-full bg-[#1A1A24] text-gray-400 hover:text-white transition-colors border border-[#2B2B3D]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-display">
            Word Duel
          </h2>
        </div>
        <div className="w-9" />
      </div>

      {/* Practice Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#13131A] border border-[#7C3AED]/30 shadow-2xl relative overflow-hidden text-center mb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent" />

        <div className="w-20 h-20 mx-auto bg-[#7C3AED]/15 rounded-full flex items-center justify-center mb-5 border border-[#7C3AED]/40 shadow-[0_0_20px_rgba(124,58,237,0.35)]">
          <Target className="w-10 h-10 text-[#A78BFA]" />
        </div>

        <h1
          className="text-2xl font-bold text-white uppercase tracking-wider mb-2"
          style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em" }}
        >
          Word Duel Practice
        </h1>

        <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed max-w-sm mx-auto">
          Form valid words from the letter set in 60 seconds. Sharpen your vocabulary with zero entry fee!
        </p>

        {/* Quick info chips */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-[#1F1F2E] flex flex-col items-center justify-center">
            <Timer className="w-4 h-4 text-[#F59E0B] mb-1" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Timer</span>
            <span className="text-xs font-bold text-white mt-0.5">60 Seconds</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-[#1F1F2E] flex flex-col items-center justify-center">
            <HelpCircle className="w-4 h-4 text-[#A78BFA] mb-1" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mode</span>
            <span className="text-xs font-bold text-white mt-0.5">Anagrams</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-[#1F1F2E] flex flex-col items-center justify-center">
            <Zap className="w-4 h-4 text-[#10B981] mb-1" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Wager</span>
            <span className="text-xs font-bold text-white mt-0.5">Free Practice</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={startGame}
            disabled={loading}
            style={{ minHeight: 52 }}
            className="btn-press w-full py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#8B5CF6] hover:to-[#7C3AED] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-[#7C3AED]/25 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> Start Practice
              </>
            )}
          </button>

          <button
            onClick={onChallengeReal}
            style={{ minHeight: 48 }}
            className="btn-press w-full py-3.5 bg-[#1A1A24] hover:bg-[#2B2B3D] text-[#A78BFA] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors border border-[#7C3AED]/40 uppercase tracking-widest"
          >
            <Sword className="w-4 h-4" /> Challenge for Real ⚔️
          </button>
        </div>
      </div>
    </div>
  );

  // ---- PLAYING ----
  if (phase === "playing") return (
    <div className="w-full flex flex-col page-fade-in">
      {/* HUD */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2 bg-[#13131A] px-4 py-2.5 rounded-2xl border border-[#1F1F2E]">
          <span className="text-3xl font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: timerColor }}>
            {String(timeLeft).padStart(2, "0")}s
          </span>
        </div>
        <div className="relative flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score</span>
          <span className="text-3xl font-extrabold text-[#F59E0B] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
        </div>
      </div>

      {/* Letter tiles */}
      <div className="flex flex-wrap gap-2.5 justify-center mb-5 p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] w-full shadow-inner">
        {letterChips.map((l, i) => (
          <div key={i}
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-extrabold shadow transition-all select-none"
            style={{ fontFamily: "'Orbitron', sans-serif", background: "#1E1E2E", border: "1px solid #7C3AED", minWidth: 56, minHeight: 56 }}
          >{l}</div>
        ))}
      </div>

      {/* Input panel */}
      <div className="w-full bg-[#13131A] rounded-2xl p-5 border border-[#1F1F2E] shadow-xl relative overflow-hidden mb-5">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#10B981] to-transparent" />

        {/* Floating emoji */}
        <div className="relative h-14 flex items-center justify-center mb-2 overflow-visible">
          {floatEmojis.map(({ id, emoji, pts }) => (
            <span key={id} className="absolute text-2xl emoji-pop pointer-events-none" style={{ bottom: 0 }}>
              {emoji}
            </span>
          ))}
          {feedback && (
            <span className={`text-sm font-bold uppercase tracking-widest ${feedback.type === "success" ? "text-[#10B981]" : "text-[#EF4444]"}`}
              style={{ fontFamily: "'Inter', sans-serif", animation: "page-fade-in 0.2s ease" }}>
              {feedback.msg}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="word-input-field"
            type="text"
            value={currentWord}
            onChange={(e) => setCurrentWord(e.target.value.toUpperCase())}
            placeholder="TYPE WORD..."
            disabled={isChecking}
            autoFocus
            className="input-glow w-full bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl px-4 py-4 text-center text-2xl text-white uppercase transition-all disabled:opacity-40"
            style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}
          />
          <button
            type="submit"
            disabled={!currentWord.trim() || isChecking}
            className="btn-press bg-[#10B981] hover:bg-[#059669] disabled:bg-[#1F1F2E] text-white px-5 rounded-xl font-bold flex items-center justify-center transition-colors"
            style={{ minWidth: 56 }}
          >
            {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : "→"}
          </button>
        </form>
      </div>

      {/* Found words */}
      <div className="max-h-[130px] overflow-y-auto bg-[#0A0A0F] rounded-xl p-4 border border-[#1F1F2E] mb-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">✅ Words ({foundWords.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {foundWords.map(({ word, len }, i) => (
            <span key={i} className="word-slide-in flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 rounded-lg uppercase">
              {wordEmoji(len)} {word}
            </span>
          ))}
          {!foundWords.length && <span className="text-xs text-gray-600 italic font-mono">Start typing...</span>}
        </div>
      </div>

      {longestWord && (
        <div className="text-center mb-4">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Best Word </span>
          <span className="text-lg font-bold text-[#A78BFA] font-mono ml-1">{wordEmoji(longestWord.length)} {longestWord}</span>
        </div>
      )}

      <button onClick={onChallengeReal} className="text-xs text-gray-500 hover:text-[#10B981] flex items-center justify-center gap-1 transition-colors font-bold uppercase tracking-widest">
        <Sword className="w-3 h-3" /> Challenge for Real ⚔️
      </button>
    </div>
  );

  // ---- GAME OVER ----
  return (
    <div className="w-full bg-[#13131A] rounded-2xl p-8 border-2 border-[#A78BFA]/25 shadow-[0_0_35px_rgba(167,139,250,0.1)] text-center page-fade-in">
      <Trophy className="w-16 h-16 text-[#A78BFA] mx-auto mb-4" />
      <h1 className="text-3xl font-extrabold text-white mb-6 uppercase" style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em", fontWeight: 700 }}>Time's Up! ⏱️</h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Score", value: String(score), color: "#F59E0B" },
          { label: "Words", value: String(foundWords.length), color: "#F1F1F3" },
          { label: "Best", value: longestWord || "—", color: "#10B981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0A0A0F] p-4 rounded-xl border border-[#1F1F2E]">
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</div>
            <div className="text-xl font-bold truncate" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={async () => { await navigator.clipboard.writeText(`I scored ${score} pts in Word Duel on NimArena! 🏆 #NimArena #Cycle1`).catch(() => {}); }}
        className="btn-press w-full mb-3 py-3 rounded-xl bg-[#1F1F2E] hover:bg-gray-800 text-gray-300 font-bold text-xs uppercase tracking-widest border border-gray-700 transition-colors"
      >
        📋 Share Result
      </button>
      <button
        onClick={startGame}
        disabled={loading}
        className="btn-press w-full mb-3 py-3.5 rounded-xl bg-[#1F1F2E] hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-widest border border-gray-700 transition-colors"
        style={{ minHeight: 48 }}
      >
        Try Again
      </button>
      <button
        onClick={onChallengeReal}
        className="btn-press w-full py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-colors"
        style={{ minHeight: 48 }}
      >
        <Sword className="w-4 h-4" /> Challenge for Real ⚔️
      </button>
    </div>
  );
}
export default WordDuelPractice;
