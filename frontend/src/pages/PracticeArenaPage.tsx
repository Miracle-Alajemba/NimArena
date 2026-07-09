import React, { useState, useEffect, useRef } from "react";
import { Header } from "../components/layout/Header";
import { useApi } from "../hooks/useApi";
import { Loader2, Timer, Trophy, Zap, AlertCircle, Play, ArrowRight, Sword } from "lucide-react";

interface PracticeArenaPageProps {
  onExit: () => void;
  onChallengeReal: () => void;
}

export function PracticeArenaPage({ onExit, onChallengeReal }: PracticeArenaPageProps) {
  const { validateWord } = useApi();
  
  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Input & Word State
  const [currentWord, setCurrentWord] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; emoji: string; type: 'success' | 'error' | null }>({ message: "", emoji: "", type: null });
  const [animationTrigger, setAnimationTrigger] = useState(0); // Used to re-trigger animations
  
  // Metrics
  const [longestWord, setLongestWord] = useState("");
  const [validWordsCount, setValidWordsCount] = useState(0);
  
  // Refs for Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Audio Context on first interaction
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'success' | 'error') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
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

  const startGame = () => {
    initAudio();
    setIsPlaying(true);
    setIsGameOver(false);
    setTimeLeft(60);
    setCurrentWord("");
    setLongestWord("");
    setValidWordsCount(0);
    setFeedback({ message: "", emoji: "", type: null });
  };

  // Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      setIsPlaying(false);
      setIsGameOver(true);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const getEmojiForLength = (length: number) => {
    if (length < 3) return "🙂";
    if (length <= 4) return "👍";
    if (length <= 6) return "🔥";
    if (length <= 8) return "🚀";
    return "🤯";
  };

  const handleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord.trim() || isChecking || !isPlaying) return;

    const wordToValidate = currentWord.trim().toUpperCase();
    setIsChecking(true);

    try {
      const isValid = await validateWord(wordToValidate);
      setAnimationTrigger(prev => prev + 1);

      if (isValid) {
        playSound('success');
        const emoji = getEmojiForLength(wordToValidate.length);
        setFeedback({ message: "Valid Word!", emoji, type: 'success' });
        
        setValidWordsCount(prev => prev + 1);
        if (wordToValidate.length > longestWord.length) {
          setLongestWord(wordToValidate);
        }
        setCurrentWord("");
      } else {
        playSound('error');
        setFeedback({ message: "Not in dictionary", emoji: "❌", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      playSound('error');
      setFeedback({ message: "Error checking word", emoji: "⚠️", type: 'error' });
    } finally {
      setIsChecking(false);
      // Clear feedback after 1.5s
      setTimeout(() => {
        setFeedback({ message: "", emoji: "", type: null });
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      <Header onBack={onExit} />

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {!isPlaying && !isGameOver && (
          <div className="w-full bg-[#13131A] rounded-2xl p-8 border-2 border-[#10B981]/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] text-center">
            <div className="w-16 h-16 mx-auto bg-[#10B981]/20 rounded-full flex items-center justify-center mb-4 border border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Zap className="w-8 h-8 text-[#10B981]" />
            </div>
            <h1 className="text-2xl font-display font-extrabold tracking-widest uppercase mb-2">Practice Arena</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Find as many words as you can in 60 seconds. Longer words grant better emojis. No wallet required!
            </p>
            <button
              onClick={startGame}
              className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
            >
              <Play className="w-5 h-5" />
              Start Practice
            </button>
            <button
              onClick={onChallengeReal}
              className="w-full mt-4 py-4 bg-transparent hover:bg-[#1F1F2E] text-[#10B981] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-[#10B981]/30 uppercase tracking-widest"
            >
              <Sword className="w-5 h-5" />
              Challenge for Real
            </button>
          </div>
        )}

        {isPlaying && (
          <div className="w-full flex flex-col items-center">
            {/* HUD */}
            <div className="w-full flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-2 bg-[#13131A] px-4 py-2 rounded-xl border border-[#1F1F2E]">
                <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[#10B981]'}`} />
                <span className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Valid Words</div>
                <div className="text-xl font-mono font-bold text-[#10B981]">{validWordsCount}</div>
              </div>
            </div>

            {/* Main Interactive Area */}
            <div className="w-full bg-[#13131A] rounded-2xl p-6 border border-[#1F1F2E] shadow-xl relative overflow-hidden">
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

              <form onSubmit={handleWordSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={currentWord}
                  onChange={(e) => setCurrentWord(e.target.value.toUpperCase())}
                  placeholder="TYPE A WORD..."
                  disabled={isChecking}
                  autoFocus
                  className="w-full bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl px-4 py-4 text-center text-2xl font-display tracking-widest text-white uppercase focus:outline-none focus:border-[#10B981] transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentWord.trim() || isChecking}
                  className="bg-[#10B981] disabled:bg-gray-700 text-white px-6 rounded-xl font-bold flex items-center justify-center transition-colors"
                >
                  {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                </button>
              </form>
            </div>

            {/* Longest Word Display */}
            {longestWord && (
              <div className="mt-8 text-center animate-fade-in">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Longest Word</div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-xl">{getEmojiForLength(longestWord.length)}</span>
                  <span className="text-xl font-mono text-[#A78BFA] font-bold">{longestWord}</span>
                </div>
              </div>
            )}

            {/* Subtle Challenge Button */}
            <button
              onClick={onChallengeReal}
              className="mt-12 text-xs text-gray-500 hover:text-[#10B981] flex items-center gap-1 transition-colors uppercase tracking-widest font-bold"
            >
              <Sword className="w-3 h-3" />
              Challenge for Real
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="w-full bg-[#13131A] rounded-2xl p-8 border-2 border-[#A78BFA]/30 shadow-[0_0_30px_rgba(167,139,250,0.1)] text-center animate-fade-in">
            <Trophy className="w-16 h-16 text-[#A78BFA] mx-auto mb-4" />
            <h1 className="text-3xl font-display font-extrabold tracking-widest uppercase mb-6 text-white">
              Time's Up!
            </h1>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#0A0A0F] p-4 rounded-xl border border-[#1F1F2E]">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Words</div>
                <div className="text-3xl font-mono text-white">{validWordsCount}</div>
              </div>
              <div className="bg-[#0A0A0F] p-4 rounded-xl border border-[#1F1F2E]">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Longest</div>
                <div className="text-xl font-mono text-[#10B981] truncate px-1">
                  {longestWord || "None"}
                </div>
                {longestWord && (
                  <div className="text-sm mt-1">{getEmojiForLength(longestWord.length)}</div>
                )}
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-[#1F1F2E] hover:bg-gray-800 text-white font-bold rounded-xl mb-3 transition-colors uppercase tracking-widest border border-gray-700"
            >
              Try Again
            </button>
            <button
              onClick={onChallengeReal}
              className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              <Sword className="w-5 h-5" />
              Challenge for Real
            </button>
          </div>
        )}
      </main>

      {/* Inject custom shake keyframes if not present in global CSS */}
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
