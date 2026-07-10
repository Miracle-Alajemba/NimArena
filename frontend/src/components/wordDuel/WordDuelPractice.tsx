import React, { useState, useEffect, useRef } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useWordDuel } from "../../hooks/useWordDuel";
import { Loader2, Timer, Trophy, Zap, ArrowRight, Sword, ShieldCheck } from "lucide-react";

interface WordDuelPracticeProps {
  onExit: () => void;
  onChallengeReal: () => void;
}

export function WordDuelPractice({ onExit, onChallengeReal }: WordDuelPracticeProps) {
  const { walletAddress } = useNimiq();
  const { startSession, submitWord, finalizeSession } = useWordDuel();

  // Practice Game States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [letters, setLetters] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentWord, setCurrentWord] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; emoji: string; type: 'success' | 'error' | null }>({ message: "", emoji: "", type: null });
  const [animationTrigger, setAnimationTrigger] = useState(0);

  // Metrics
  const [longestWord, setLongestWord] = useState("");

  // Refs for Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'success' | 'error') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  };

  const startGame = async () => {
    initAudio();
    setLoading(true);
    try {
      const userAddr = walletAddress || "0x0000000000000000000000000000000000000000";
      const sessionData = await startSession(0, userAddr, "medium");
      setSessionId(sessionData.sessionId);
      setLetters(sessionData.letters);
      
      setScore(0);
      setFoundWords([]);
      setLongestWord("");
      setCurrentWord("");
      setFeedback({ message: "", emoji: "", type: null });
      setTimeLeft(sessionData.duration || 60);

      setIsPlaying(true);
      setIsGameOver(false);
    } catch (err) {
      console.error("WordDuelPractice: Failed to start session:", err);
      alert("Failed to initialize practice session.");
    } finally {
      setLoading(false);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (!isPlaying || !sessionId) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, sessionId]);

  // Global Keyboard listener for auto-focusing input field
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || loading || isChecking || timeLeft <= 0) return;
      const inputEl = document.getElementById("word-input-field") as HTMLInputElement;
      if (!inputEl) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      if (document.activeElement !== inputEl) {
        if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
          inputEl.focus();
          setCurrentWord((prev) => (prev + e.key).toUpperCase());
          e.preventDefault();
        } else if (e.key === "Backspace") {
          inputEl.focus();
          setCurrentWord((prev) => prev.slice(0, -1));
          e.preventDefault();
        } else if (e.key === "Enter") {
          inputEl.focus();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isPlaying, loading, isChecking, timeLeft]);

  const handleGameOver = async () => {
    setIsPlaying(false);
    setIsGameOver(true);
    if (sessionId) {
      try {
        await finalizeSession(sessionId);
      } catch (err) {
        console.error("WordDuelPractice: Failed to finalize practice session:", err);
      }
    }
  };

  const getEmojiForLength = (length: number) => {
    if (length < 3) return "🙂";
    if (length <= 4) return "👍";
    if (length <= 6) return "🔥";
    if (length <= 8) return "🚀";
    return "🤯";
  };

  const handleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord.trim() || isChecking || !sessionId || !isPlaying) return;

    const wordToValidate = currentWord.trim().toUpperCase();
    setIsChecking(true);
    setAnimationTrigger(prev => prev + 1);

    try {
      const res = await submitWord(sessionId, wordToValidate);
      if (res.valid) {
        playSound('success');
        const emoji = getEmojiForLength(wordToValidate.length);
        setFeedback({ message: `+${res.scoreAdded} Points!`, emoji, type: 'success' });
        
        setScore(res.totalScore);
        if (res.foundWords) {
          setFoundWords(res.foundWords);
        } else {
          setFoundWords(prev => [...prev, wordToValidate.toLowerCase()]);
        }

        if (wordToValidate.length > longestWord.length) {
          setLongestWord(wordToValidate);
        }
        setCurrentWord("");
      } else {
        playSound('error');
        setFeedback({ message: res.error || "Invalid Word", emoji: "❌", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      playSound('error');
      setFeedback({ message: "Network Error", emoji: "⚠️", type: 'error' });
    } finally {
      setIsChecking(false);
      setTimeout(() => {
        setFeedback({ message: "", emoji: "", type: null });
      }, 1500);
    }
  };

  const letterChips = letters.toUpperCase().split("");

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Lobby state */}
      {!isPlaying && !isGameOver && (
        <div className="w-full bg-[#13131A] rounded-2xl p-8 border-2 border-[#10B981]/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] text-center">
          <div className="w-16 h-16 mx-auto bg-[#10B981]/20 rounded-full flex items-center justify-center mb-4 border border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <Zap className="w-8 h-8 text-[#10B981]" />
          </div>
          <h1 className="text-2xl font-display font-extrabold tracking-widest uppercase mb-2">Practice Arena</h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Form as many valid words as possible in 60 seconds from the letter set. No wallet required!
          </p>
          <button
            onClick={startGame}
            disabled={loading}
            style={{ minHeight: "52px" }}
            className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Practice"}
          </button>
          <button
            onClick={onChallengeReal}
            style={{ minHeight: "52px" }}
            className="w-full mt-4 py-4 bg-transparent hover:bg-[#1F1F2E] text-[#10B981] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-[#10B981]/30 uppercase tracking-widest"
          >
            <Sword className="w-5 h-5" /> Challenge for Real
          </button>
        </div>
      )}

      {/* Playing state */}
      {isPlaying && (
        <div className="w-full flex flex-col items-center">
          {/* HUD */}
          <div className="w-full flex justify-between items-center mb-6 px-2">
            <div className="flex items-center gap-2 bg-[#13131A] px-4 py-2 rounded-xl border border-[#1F1F2E]">
              <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[#10B981]'}`} />
              <span className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score</div>
              <div className="text-2xl font-mono font-bold text-[#F59E0B]">{score}</div>
            </div>
          </div>

          {/* Letter set display */}
          <div className="flex flex-wrap gap-2.5 justify-center mb-6 p-6 rounded-2xl bg-[#13131A]/80 border border-[#1F1F2E] w-full shadow-inner">
            {letterChips.map((letter, idx) => (
              <div
                key={idx}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex items-center justify-center text-white text-xl sm:text-2xl font-display font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.3)] select-none hover:border-[#7C3AED] transition-colors"
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Main Interactive Area */}
          <div className="w-full bg-[#13131A] rounded-2xl p-6 border border-[#1F1F2E] shadow-xl relative overflow-hidden mb-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent opacity-50" />
            
            {/* Feedback Animation */}
            <div className="h-24 flex items-center justify-center mb-4">
              {feedback.type && (
                <div 
                  key={animationTrigger}
                  className={`flex flex-col items-center ${
                    feedback.type === 'success' ? 'animate-[bounce_0.5s_ease-in-out]' : 'animate-[shake_0.4s_ease-in-out]'
                  }`}
                >
                  <span className="text-5xl mb-2 drop-shadow-lg">{feedback.emoji}</span>
                  <span className={`text-sm font-bold uppercase tracking-widest ${
                    feedback.type === 'success' ? 'text-[#10B981]' : 'text-red-500'
                  }`}>
                    {feedback.message}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleWordSubmit} className="flex gap-2 w-full">
              <input
                id="word-input-field"
                type="text"
                value={currentWord}
                onChange={(e) => setCurrentWord(e.target.value.toUpperCase())}
                placeholder="TYPE WORD..."
                disabled={isChecking}
                autoFocus
                className="w-full bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl px-4 py-4 text-center text-2xl font-display tracking-widest text-white uppercase focus:outline-none focus:border-[#10B981] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!currentWord.trim() || isChecking}
                style={{ minWidth: "60px" }}
                className="bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-700 text-white px-5 rounded-xl font-bold flex items-center justify-center transition-colors"
              >
                {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
              </button>
            </form>
          </div>

          {/* Found Words Summary */}
          <div className="w-full max-h-[140px] overflow-y-auto bg-[#0A0A0F] rounded-xl p-4 border border-[#1F1F2E] mb-6">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Words Found ({foundWords.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {foundWords.map((word, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-[#13131A] border border-[#1F1F2E] text-gray-300 rounded-lg uppercase"
                >
                  {word}
                </span>
              ))}
              {foundWords.length === 0 && (
                <span className="text-xs text-gray-600 font-mono italic">No words found yet.</span>
              )}
            </div>
          </div>

          {/* Longest Word Display */}
          {longestWord && (
            <div className="text-center animate-fade-in mb-6">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Longest Word</div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xl">{getEmojiForLength(longestWord.length)}</span>
                <span className="text-xl font-mono text-[#A78BFA] font-bold">{longestWord}</span>
              </div>
            </div>
          )}

          {/* Challenge Button */}
          <button
            onClick={onChallengeReal}
            className="text-xs text-gray-500 hover:text-[#10B981] flex items-center gap-1 transition-colors uppercase tracking-widest font-bold"
          >
            <Sword className="w-3 h-3" />
            Challenge for Real
          </button>
        </div>
      )}

      {/* Game Over state */}
      {isGameOver && (
        <div className="w-full bg-[#13131A] rounded-2xl p-8 border-2 border-[#A78BFA]/30 shadow-[0_0_30px_rgba(167,139,250,0.1)] text-center animate-fade-in">
          <Trophy className="w-16 h-16 text-[#A78BFA] mx-auto mb-4" />
          <h1 className="text-3xl font-display font-extrabold tracking-widest uppercase mb-6 text-white">
            Time's Up!
          </h1>
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-[#0A0A0F] p-4 rounded-xl border border-[#1F1F2E]">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Score</div>
              <div className="text-2xl font-mono text-[#F59E0B] font-extrabold">{score}</div>
            </div>
            <div className="bg-[#0A0A0F] p-4 rounded-xl border border-[#1F1F2E]">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Words</div>
              <div className="text-2xl font-mono text-white">{foundWords.length}</div>
            </div>
            <div className="bg-[#0A0A0F] p-4 rounded-xl border border-[#1F1F2E]">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Longest</div>
              <div className="text-sm font-mono text-[#10B981] truncate px-1 mt-1.5">
                {longestWord || "None"}
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            style={{ minHeight: "52px" }}
            className="w-full py-4 bg-[#1F1F2E] hover:bg-gray-800 text-white font-bold rounded-xl mb-3 transition-colors uppercase tracking-widest border border-gray-700"
          >
            Try Again
          </button>
          <button
            onClick={onChallengeReal}
            style={{ minHeight: "52px" }}
            className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest shadow-[0_0_20px_rgba(124,58,237,0.3)]"
          >
            <Sword className="w-5 h-5" />
            Challenge for Real
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}} />
    </div>
  );
}

