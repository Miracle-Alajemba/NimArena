import React, { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { Timer, CheckCircle2, XCircle, Trophy, Play, Sword, Target, ArrowLeft, HelpCircle, Zap } from "lucide-react";

interface TriviaPracticeProps {
  onExit: () => void;
  onChallengeReal: () => void;
}

interface QuestionData {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIdx: number;
  category: string;
  difficulty: string;
}

const FALLBACK_PRACTICE_QUESTIONS: QuestionData[] = [
  {
    id: 1,
    question: "What is the native cryptocurrency of the Nimiq network?",
    optionA: "NIM",
    optionB: "USDT",
    optionC: "BTC",
    optionD: "ETH",
    correctIdx: 0,
    category: "Web3",
    difficulty: "easy"
  },
  {
    id: 2,
    question: "Which layer-2 EVM blockchain does NimArena use for smart contract wagers?",
    optionA: "Base",
    optionB: "Polygon",
    optionC: "Arbitrum",
    optionD: "Optimism",
    correctIdx: 0,
    category: "Web3",
    difficulty: "medium"
  },
  {
    id: 3,
    question: "What chemical element has the symbol 'Au'?",
    optionA: "Silver",
    optionB: "Gold",
    optionC: "Copper",
    optionD: "Iron",
    correctIdx: 1,
    category: "Science",
    difficulty: "easy"
  },
  {
    id: 4,
    question: "What is the capital city of France?",
    optionA: "Berlin",
    optionB: "Madrid",
    optionC: "Paris",
    optionD: "Rome",
    correctIdx: 2,
    category: "General",
    difficulty: "easy"
  },
  {
    id: 5,
    question: "How many seconds do players get per round in Word Pot?",
    optionA: "30 Seconds",
    optionB: "60 Seconds",
    optionC: "90 Seconds",
    optionD: "120 Seconds",
    correctIdx: 1,
    category: "Gaming",
    difficulty: "easy"
  }
];

export function TriviaPractice({ onExit, onChallengeReal }: TriviaPracticeProps) {
  const { get } = useApi();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  // Gameplay states
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);

  // Timer State (15 seconds per question for practice)
  const [timeLeftMs, setTimeLeftMs] = useState<number>(15000);
  const timerRef = useRef<any>(null);
  const startTimestampRef = useRef<number>(0);
  
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

  const startGame = async () => {
    initAudio();
    setLoading(true);
    try {
      const qData = await get("/api/trivia/practice/questions");
      if (Array.isArray(qData) && qData.length > 0) {
        setQuestions(qData);
      } else {
        setQuestions(FALLBACK_PRACTICE_QUESTIONS);
      }
      setScore(0);
      setCurrentQIndex(0);
      setIsGameOver(false);
      setIsPlaying(true);
      startQuestionTimer();
    } catch (err) {
      console.warn("TriviaPractice: Failed to fetch questions, loading fallback array:", err);
      setQuestions(FALLBACK_PRACTICE_QUESTIONS);
      setScore(0);
      setCurrentQIndex(0);
      setIsGameOver(false);
      setIsPlaying(true);
      startQuestionTimer();
    } finally {
      setLoading(false);
    }
  };

  const startQuestionTimer = () => {
    setSelectedIdx(null);
    setIsAnswering(false);
    setTimeLeftMs(15000);
    
    startTimestampRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimestampRef.current;
      const remaining = Math.max(0, 15000 - elapsed);
      setTimeLeftMs(remaining);

      if (remaining === 0) {
        handleOptionSelect(-1); // Auto fail
      }
    }, 100);
  };

  const handleOptionSelect = (optIdx: number) => {
    if (isAnswering || questions.length === 0) return;
    setIsAnswering(true);
    setSelectedIdx(optIdx);

    if (timerRef.current) clearInterval(timerRef.current);

    const question = questions[currentQIndex];
    const isCorrect = optIdx === question.correctIdx;

    if (isCorrect) {
      playSound('success');
      const elapsed = Date.now() - startTimestampRef.current;
      const finalTimeRemaining = Math.max(0, 15000 - elapsed);
      const speedBonus = Math.round((finalTimeRemaining / 15000) * 50);
      setScore(prev => prev + 100 + speedBonus);
    } else {
      playSound('error');
    }

    // Wait 2 seconds then move to next
    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        startQuestionTimer();
      } else {
        setIsPlaying(false);
        setIsGameOver(true);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isPlaying && !isGameOver) {
    return (
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
            <span className="text-xl">⚡</span>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider font-display">
              Speed Trivia
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
            Trivia Practice
          </h1>

          <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed max-w-sm mx-auto">
            Test your knowledge with 10 rapid-fire questions. 15 seconds per question. Faster answers earn higher multiplier points!
          </p>

          {/* Quick info chips */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-[#1F1F2E] flex flex-col items-center justify-center">
              <HelpCircle className="w-4 h-4 text-[#A78BFA] mb-1" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Count</span>
              <span className="text-xs font-bold text-white mt-0.5">10 Questions</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-[#1F1F2E] flex flex-col items-center justify-center">
              <Timer className="w-4 h-4 text-[#F59E0B] mb-1" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Timer</span>
              <span className="text-xs font-bold text-white mt-0.5">15s / Q</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-[#1F1F2E] flex flex-col items-center justify-center">
              <Zap className="w-4 h-4 text-[#10B981] mb-1" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bonus</span>
              <span className="text-xs font-bold text-white mt-0.5">Speed Multi</span>
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
              <Sword className="w-4 h-4" /> Challenge for Real ⚡
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full bg-[#13131A] rounded-2xl p-8 border-2 border-[#A78BFA]/30 shadow-[0_0_30px_rgba(167,139,250,0.1)] text-center animate-fade-in">
          <Trophy className="w-16 h-16 text-[#A78BFA] mx-auto mb-4" />
          <h1 className="text-3xl font-display font-extrabold tracking-widest uppercase mb-6 text-white">
            Practice Complete!
          </h1>
          
          <div className="bg-[#0A0A0F] p-6 rounded-xl border border-[#1F1F2E] mb-8">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Final Score</div>
            <div className="text-5xl font-mono text-[#F59E0B] font-extrabold">{score}</div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 bg-[#1F1F2E] hover:bg-gray-800 text-white font-bold rounded-xl mb-3 transition-colors uppercase tracking-widest border border-gray-700"
          >
            Play Again
          </button>
          <button
            onClick={onChallengeReal}
            className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest shadow-[0_0_20px_rgba(124,58,237,0.3)] mb-3"
          >
            <Sword className="w-5 h-5" /> Challenge for Real
          </button>

          {/* Share Result */}
          <button
            onClick={async () => {
              const text = `⚡ I scored ${score} points in Speed Trivia Practice on NimArena!\n\nThink you can beat me? 👉 https://nimarena.vercel.app\n#NimArena #SpeedTrivia #Web3Gaming`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: "NimArena — Speed Trivia", text });
                } else {
                  await navigator.clipboard.writeText(text);
                }
              } catch { await navigator.clipboard.writeText(text).catch(() => {}); }
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="w-full py-3 rounded-xl bg-[#1F1F2E] hover:bg-gray-800 text-gray-300 font-bold text-xs uppercase tracking-widest border border-gray-700 transition-colors"
          >
            {copied ? "✅ Copied!" : "📋 Share Result"}
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQIndex];
  if (!question) return null;

  const options = [question.optionA, question.optionB, question.optionC, question.optionD];
  const isTimeCritical = timeLeftMs < 5000;
  const progressPercent = (timeLeftMs / 15000) * 100;

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4 flex flex-col h-full justify-center">
      {/* Upper Status Row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold uppercase text-[#7C3AED] tracking-wider font-mono">
            Practice {currentQIndex + 1} of 10
          </span>
          <span className="text-xs font-bold text-gray-400 font-mono mt-0.5">
            {question.category}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
            Score
          </span>
          <span className="text-base font-extrabold text-[#F59E0B] font-mono">
            {score}
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full bg-[#1A1A24] h-2.5 rounded-full overflow-hidden mb-6 border border-[#2B2B3D]">
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full transition-all duration-100 ${isTimeCritical ? "bg-[#EF4444] animate-pulse" : "bg-[#10B981]"}`}
        />
      </div>

      {/* Timer text */}
      <div className="flex items-center gap-1.5 justify-center mb-6">
        <Timer className={`w-4 h-4 ${isTimeCritical ? "text-[#EF4444] animate-bounce" : "text-gray-400"}`} />
        <span className={`text-sm font-bold font-mono ${isTimeCritical ? "text-[#EF4444]" : "text-gray-300"}`}>
          {(timeLeftMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Question Card */}
      <div className="p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 shadow-lg min-h-[120px] flex items-center justify-center text-center">
        <h2 className="text-base font-bold text-[#F1F1F3] font-body leading-relaxed">
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((opt, idx) => {
          if (!opt) return null;

          const isSelected = selectedIdx === idx;
          const isCorrect = question.correctIdx === idx;
          const isWrong = isSelected && !isCorrect;

          let btnClass = "bg-[#13131A] border-[#1F1F2E] text-gray-200 hover:border-gray-500";
          let icon = null;

          if (isAnswering) {
            if (isCorrect) {
              btnClass = "bg-[#10B981]/15 border-[#10B981] text-[#10B981]";
              icon = <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />;
            } else if (isWrong) {
              btnClass = "bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444]";
              icon = <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />;
            } else {
              btnClass = "bg-[#13131A] border-[#1F1F2E] text-gray-500 opacity-60";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              disabled={isAnswering}
              style={{ minHeight: "52px" }}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 text-left ${btnClass}`}
            >
              <span className="font-body leading-relaxed">{opt}</span>
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
