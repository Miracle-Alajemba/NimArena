import React, { useState, useEffect, useRef } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useWordDuel } from "../../hooks/useWordDuel";
import { Loader2, Timer, Zap, ArrowRight, ShieldCheck } from "lucide-react";

interface WordDuelGameProps {
  roundId: number;
  entryFee: string;
  onComplete: (sessionId: string, score: number, proof: string) => void;
  onExit: () => void;
}

export function WordDuelGame({ roundId, entryFee, onComplete, onExit }: WordDuelGameProps) {
  const { walletAddress } = useNimiq();
  const { startSession, submitWord, finalizeSession } = useWordDuel();

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [letters, setLetters] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Gameplay State
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentInput, setCurrentInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; emoji: string; type: 'success' | 'error' | null }>({ message: "", emoji: "", type: null });
  const [animationTrigger, setAnimationTrigger] = useState(0);

  // Audio Context Ref
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
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      
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

  // Initialize Word Duel Session
  useEffect(() => {
    async function initSession() {
      if (!walletAddress) return;
      try {
        const sessionData = await startSession(roundId, walletAddress, "medium");
        setSessionId(sessionData.sessionId);
        setLetters(sessionData.letters);
        setTimeLeft(sessionData.duration || 60);
        setLoading(false);
        initAudio();
      } catch (err) {
        console.error("WordDuelGame: Failed to start session:", err);
        alert("Failed to start Word Duel session. Returning to lobby.");
        onExit();
      }
    }
    initSession();
  }, [roundId, walletAddress, startSession, onExit]);

  // Countdown timer
  useEffect(() => {
    if (loading || !sessionId) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalize();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, sessionId]);

  const handleFinalize = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await finalizeSession(sessionId);
      onComplete(sessionId, res.score, res.proof);
    } catch (err) {
      console.error("WordDuelGame: Finalize failed:", err);
      alert("Failed to submit score to contract server. Please try again.");
      onExit();
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
    if (!currentInput.trim() || isChecking || !sessionId || timeLeft <= 0) return;

    const wordToValidate = currentInput.trim().toUpperCase();
    setIsChecking(true);
    setAnimationTrigger((prev) => prev + 1);

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
        setCurrentInput("");
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

  if (loading && !letters) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
        <span className="text-sm font-extrabold uppercase tracking-wider">Generating Letter Set...</span>
      </div>
    );
  }

  // Display letters list
  const letterChips = letters.toUpperCase().split("");

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-6 flex flex-col h-full justify-center">
      {/* HUD Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 bg-[#13131A] px-4 py-2 rounded-xl border border-[#1F1F2E]">
          <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[#10B981]'}`} />
          <span className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
            Total Score
          </span>
          <span className="text-2xl font-extrabold text-[#F59E0B] font-mono">
            {score}
          </span>
        </div>
      </div>

      {/* Generated Letters Display */}
      <div className="flex flex-wrap gap-2.5 justify-center mb-6 p-6 rounded-2xl bg-[#13131A]/80 border border-[#1F1F2E] shadow-inner">
        {letterChips.map((letter, idx) => (
          <div
            key={idx}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex items-center justify-center text-white text-xl sm:text-2xl font-display font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.3)] select-none hover:border-[#7C3AED] transition-colors"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Main Interactive Panel */}
      <div className="w-full bg-[#13131A] rounded-2xl p-6 border border-[#1F1F2E] shadow-xl relative overflow-hidden mb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-50" />
        
        {/* Feedback Display */}
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

        <form onSubmit={handleWordSubmit} className="flex gap-2">
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
            placeholder="ENTER WORD..."
            disabled={isChecking || timeLeft <= 0}
            autoFocus
            className="w-full bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl px-4 py-4 text-center text-2xl font-display tracking-widest text-white uppercase focus:outline-none focus:border-[#7C3AED] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!currentInput.trim() || isChecking || timeLeft <= 0}
            style={{ minWidth: "60px" }}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-700 text-white px-5 rounded-xl font-bold flex items-center justify-center transition-colors"
          >
            {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
          </button>
        </form>
      </div>

      {/* Found Words Summary */}
      <div className="flex-1 max-h-[160px] overflow-y-auto bg-[#0A0A0F] rounded-xl p-4 border border-[#1F1F2E]">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Found Words ({foundWords.length})
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
export default WordDuelGame;
