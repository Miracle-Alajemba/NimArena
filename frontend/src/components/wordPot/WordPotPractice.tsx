import React, { useState, useEffect, useRef } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useApi } from "../../hooks/useApi";
import { Loader2, ArrowLeft, Trophy, RotateCcw, Volume2, VolumeX, ShieldCheck } from "lucide-react";
import { PremiumLoader } from "../layout/PremiumLoader";
import { wordEmoji } from "../../lib/gameLogic";

interface WordPotPracticeProps {
  onExit: () => void;
  onChallengeReal: () => void;
}

export function WordPotPractice({ onExit, onChallengeReal }: WordPotPracticeProps) {
  const { walletAddress } = useNimiq();
  const { post } = useApi();

  const [loading, setLoading] = useState(true);
  const [sourceWord, setSourceWord] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Game state
  const [currentInput, setCurrentInput] = useState<string>("");
  const [foundWords, setFoundWords] = useState<Array<{ word: string; score: number }>>([]);
  const [score, setScore] = useState<number>(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(60000);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const timerRef = useRef<any>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: "type" | "submit" | "error" | "win" | "tick") => {
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "type") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "submit") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "win") {
      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "tick") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  };

  const startGame = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      // Use Word Pot session logic for Practice
      const data = await post("/api/word-pot/session/start", {
        roundId: 0, 
        walletAddress: walletAddress || "guest"
      });

      if (data && data.sourceWord) {
        setSourceWord(data.sourceWord);
        setSessionId(data.sessionId);
        setCurrentInput("");
        setFoundWords([]);
        setScore(0);
        setTimeLeftMs(60000);
        setIsGameOver(false);
      } else {
        throw new Error("Failed to load letters");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to start practice round");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading || isGameOver) return;

    const tickMs = 50;
    timerRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= tickMs) {
          clearInterval(timerRef.current);
          setIsGameOver(true);
          playSound("win");
          return 0;
        }
        if (prev <= 10000 && prev % 1000 < tickMs) {
          playSound("tick");
        }
        return prev - tickMs;
      });
    }, tickMs);

    return () => clearInterval(timerRef.current);
  }, [loading, isGameOver]);

  useEffect(() => {
    if (!loading && !isGameOver && gameAreaRef.current) {
      gameAreaRef.current.focus();
    }
  }, [loading, isGameOver]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isGameOver) return;
    initAudio();

    if (e.key === "Enter") {
      handleSubmitWord();
    } else if (e.key === "Backspace") {
      setCurrentInput((prev) => prev.slice(0, -1));
      playSound("type");
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      if (currentInput.length < sourceWord.length) {
        setCurrentInput((prev) => (prev + e.key).toUpperCase());
        playSound("type");
      }
    }
  };

  const handleLetterClick = (letter: string) => {
    if (isGameOver || currentInput.length >= sourceWord.length) return;
    initAudio();
    setCurrentInput((prev) => prev + letter);
    playSound("type");
  };

  const handleSubmitWord = async () => {
    if (currentInput.length < 3) {
      showError("Word too short!");
      return;
    }

    try {
      // Practice mode uses Word Pot submit logic
      const res = await post("/api/word-pot/session/submit-word", {
        sessionId,
        word: currentInput.toLowerCase()
      });

      if (res && res.valid) {
        const pts = res.scoreAdded ?? 1;
        setFoundWords((prev) => [{ word: res.word.toUpperCase(), score: pts }, ...prev]);
        setScore((prev) => prev + pts);
        setCurrentInput("");
        playSound("submit");
      }
    } catch (err: any) {
      showError(err.message || "Invalid word");
    }
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    playSound("error");
    setCurrentInput("");
    setTimeout(() => setErrorMsg(null), 1500);
  };

  if (loading) {
    return <PremiumLoader text="GENERATING PRACTICE ARENA..." />;
  }

  // Use the same letter counts logic for rendering disabled state
  const inputCounts: Record<string, number> = {};
  for (const char of currentInput) {
    inputCounts[char] = (inputCounts[char] || 0) + 1;
  }
  const sourceCounts: Record<string, number> = {};
  for (const char of sourceWord) {
    sourceCounts[char] = (sourceCounts[char] || 0) + 1;
  }

  if (isGameOver) {
    const longestWord = [...foundWords].sort((a, b) => b.word.length - a.word.length)[0]?.word || "N/A";
    
    return (
      <div className="w-full max-w-md mx-auto pt-6 px-4 page-fade-in pb-24">
        {/* Persistent subtle play for real button */}
        <div className="fixed bottom-[90px] left-0 right-0 flex justify-center z-40 pointer-events-none">
          <button
            onClick={onChallengeReal}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#10B981]/90 backdrop-blur border border-[#10B981] text-white text-sm font-bold shadow-lg shadow-[#10B981]/20 hover:bg-[#10B981] transition-all hover:scale-105"
          >
            Play for Real 🏺
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <button onClick={onExit} className="p-2 rounded-full bg-[#1A1A24] text-gray-400 hover:text-white transition-colors border border-[#2B2B3D]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏺</span>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-display">Word Pot</h2>
          </div>
          <div className="w-9" />
        </div>

        <div className="p-8 rounded-2xl bg-[#1A1A24] border border-[#2B2B3D] text-center shadow-2xl relative overflow-hidden mb-6">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent"></div>
          
          <Trophy className="w-16 h-16 text-[#F59E0B] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2 font-display uppercase tracking-wider">Practice Complete</h2>
          <p className="text-gray-400 mb-8 text-sm">Great warm up! Ready for the real pot?</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-[#13131A] border border-[#2B2B3D]">
              <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Final Score</div>
              <div className="text-3xl font-extrabold text-[#F59E0B] font-mono">{score}</div>
            </div>
            <div className="p-4 rounded-xl bg-[#13131A] border border-[#2B2B3D]">
              <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Words Found</div>
              <div className="text-3xl font-extrabold text-[#10B981] font-mono">{foundWords.length}</div>
            </div>
          </div>
          
          {foundWords.length > 0 && (
            <div className="p-4 rounded-xl bg-[#13131A] border border-[#2B2B3D] mb-8 flex justify-between items-center">
              <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Longest Word</span>
              <span className="text-lg font-bold text-[#F59E0B] font-mono ml-1">{wordEmoji(longestWord.length)} {longestWord}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="flex-1 rounded-xl bg-[#2B2B3D] hover:bg-[#3F3F5A] text-white text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 py-4"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={onChallengeReal}
              className="flex-1 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 py-4 shadow-lg shadow-[#F59E0B]/20"
            >
              Play for Real 🏺
            </button>
          </div>
        </div>
      </div>
    );
  }

  const secs = Math.ceil(timeLeftMs / 1000);
  const danger = secs <= 10;

  return (
    <div 
      className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4 px-4 h-full min-h-screen flex flex-col focus:outline-none pb-32"
      onKeyDown={handleKeyPress}
      tabIndex={0}
      ref={gameAreaRef}
    >
      {/* Top Banner */}
      <div className="w-full bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl py-2 px-4 mb-4 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#10B981]" />
        <span className="text-[#10B981] text-xs font-bold uppercase tracking-widest">
          ⚡ Practice Mode — No Entry Fee
        </span>
      </div>

      {/* Persistent subtle play for real button */}
      <div className="fixed bottom-[90px] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <button
          onClick={onChallengeReal}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#10B981]/90 backdrop-blur border border-[#10B981] text-white text-sm font-bold shadow-lg shadow-[#10B981]/20 hover:bg-[#10B981] transition-all hover:scale-105"
        >
          Play for Real 🏺
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button onClick={onExit} className="p-2 rounded-full bg-[#1A1A24] text-gray-400 hover:text-white transition-colors border border-[#2B2B3D]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🏺</span>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider font-display">Word Pot</h2>
        </div>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-full bg-[#1A1A24] text-gray-400 hover:text-white transition-colors border border-[#2B2B3D]">
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Score</div>
          <div className="text-4xl font-black text-[#F59E0B] font-mono leading-none tracking-tight drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
            {score}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Time Left</div>
          <div className={`text-4xl font-black font-mono leading-none tracking-tight ${danger ? 'text-[#EF4444] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-white'}`}>
            0:{secs.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A24] rounded-2xl p-4 sm:p-6 border border-[#2B2B3D] shadow-2xl relative mb-6">
        {/* Source Word Display */}
        <div className="text-center mb-6">
          <h3 className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest mb-3">
            SOURCE WORD
          </h3>
          <div className="flex flex-wrap gap-2 justify-center p-4 rounded-2xl bg-[#13131A] border border-[#1F1F2E] shadow-inner">
            {sourceWord.toUpperCase().split("").map((letter, i) => {
              const usedInInput = (currentInput.match(new RegExp(letter, "gi")) || []).length;
              const availableInSource = sourceCounts[letter] || 0;
              const isUsed = usedInInput >= availableInSource;
              
              return (
                <div
                  key={i}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.4)] select-none
                    ${isUsed ? "bg-[#1A1A24] text-gray-600 border border-[#2B2B3D]" : "bg-[#1E1E2E] text-white border border-[#F59E0B]"}`}
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center mb-6 min-h-[48px]">
          {errorMsg ? (
            <div className="text-[#EF4444] font-bold uppercase tracking-widest animate-bounce">
              {errorMsg}
            </div>
          ) : (
            <div className="flex gap-2 border-b-2 border-[#F59E0B] px-4 pb-2 min-w-[120px] justify-center items-end h-[48px]">
              <span className="text-3xl font-black text-white font-mono tracking-widest leading-none">
                {currentInput}
              </span>
              <span className="w-3 h-[30px] bg-[#F59E0B] animate-pulse"></span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setCurrentInput("");
              initAudio();
            }}
            className="flex-1 py-3 rounded-xl bg-[#2B2B3D] hover:bg-[#3F3F5A] text-white font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
          >
            Clear
          </button>
          <button
            onClick={() => {
              initAudio();
              handleSubmitWord();
            }}
            disabled={currentInput.length < 3}
            className="flex-[2] py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#1A1A24] rounded-2xl p-4 border border-[#2B2B3D] overflow-hidden flex flex-col">
        <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-3 border-b border-[#2B2B3D] pb-2">
          Found Words ({foundWords.length})
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {foundWords.map((item, i) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-[#13131A] border border-[#2B2B3D]">
              <span className="font-bold text-white font-mono tracking-wider">
                {wordEmoji(item.word.length)} {item.word}
              </span>
              <span className="text-[#10B981] font-bold font-mono">+{item.score}</span>
            </div>
          ))}
          {foundWords.length === 0 && (
            <div className="text-center text-gray-500 text-xs py-8 font-mono">
              Type words to score points
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
