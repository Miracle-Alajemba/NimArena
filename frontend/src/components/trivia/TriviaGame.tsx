import React, { useState, useEffect, useRef } from "react";
import { fetchTriviaQuestions, TriviaQuestion } from "../../games/trivia/questions";
import { calculateQuestionScore, QuestionScoreResult } from "../../games/trivia/Scoring";
import { PremiumLoader } from "../layout/PremiumLoader";

interface TriviaGameProps {
  roundId: number;
  entryFee: string;
  onComplete: (sessionId: string, score: number) => void;
  onExit: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];
const QUESTION_TIMER_MS = 10000; // 10 seconds per question requirement

export function TriviaGame({ roundId, entryFee, onComplete, onExit }: TriviaGameProps) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(QUESTION_TIMER_MS);
  const timerRef = useRef<any>(null);
  const startTimestampRef = useRef<number>(0);

  const [floatPts, setFloatPts] = useState<{ id: number; pts: number }[]>([]);
  const [floatCounter, setFloatCounter] = useState(0);
  const [scoreResults, setScoreResults] = useState<QuestionScoreResult[]>([]);

  // Load questions locally via Open Trivia DB API
  useEffect(() => {
    async function initQuestions() {
      setLoading(true);
      const qList = await fetchTriviaQuestions(10);
      setQuestions(qList);
      setLoading(false);
    }
    initQuestions();
  }, []);

  const currentQ = questions[currentQIndex];

  // Question Timer
  useEffect(() => {
    if (!currentQ || loading) return;

    setSelectedIdx(null);
    setCorrectIdx(null);
    setIsAnswering(false);
    setTimeLeftMs(QUESTION_TIMER_MS);
    startTimestampRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimestampRef.current;
      const remaining = Math.max(0, QUESTION_TIMER_MS - elapsed);
      setTimeLeftMs(remaining);

      if (remaining === 0) {
        handleOptionSelect(-1); // Timeout
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQIndex, questions, loading]);

  const handleOptionSelect = (optIdx: number) => {
    if (isAnswering || !currentQ) return;
    setIsAnswering(true);
    setSelectedIdx(optIdx);

    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Date.now() - startTimestampRef.current;
    const remainingSec = Math.max(0, (QUESTION_TIMER_MS - elapsed) / 1000);

    const isCorrect = optIdx === currentQ.correctIdx;
    setCorrectIdx(currentQ.correctIdx);

    const res = calculateQuestionScore(isCorrect, remainingSec, 10);
    setScoreResults((prev) => [...prev, res]);

    if (res.totalPoints > 0) {
      const id = floatCounter + 1;
      setFloatCounter(id);
      setFloatPts((p) => [...p, { id, pts: res.totalPoints }]);
      setTimeout(() => setFloatPts((p) => p.filter((x) => x.id !== id)), 1400);
    }

    const nextScore = score + res.totalPoints;
    setScore(nextScore);

    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex((p) => p + 1);
      } else {
        const localSessId = "sess-trivia-" + Date.now();
        onComplete(localSessId, nextScore);
      }
    }, 1500);
  };

  if (loading || !currentQ) return <PremiumLoader text="Fetching Open Trivia DB Questions..." />;

  const progressPercent = (timeLeftMs / QUESTION_TIMER_MS) * 100;
  const isCritical = timeLeftMs < 3000;
  const isWarning = timeLeftMs < 6000;

  return (
    <div className="pb-24 px-4 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-5 page-fade-in">
      {/* Top timer bar */}
      <div className="w-full h-2 rounded-full overflow-hidden mb-5 bg-[#1A1A24]">
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full transition-all duration-100 rounded-full ${
            isCritical ? "bg-[#EF4444]" : isWarning ? "bg-[#F59E0B]" : "bg-[#7C3AED]"
          }`}
        />
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span
            className="text-sm font-bold text-[#A78BFA] uppercase tracking-wider font-display"
          >
            Question {currentQIndex + 1} of {questions.length} ⚡
          </span>
          <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{currentQ.category}</div>
        </div>

        {/* Score */}
        <div className="relative flex flex-col items-end">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score ⚡</span>
          <span
            className="text-2xl font-extrabold text-[#F59E0B] font-mono"
          >
            {score}
          </span>
          {floatPts.map(({ id, pts }) => (
            <span
              key={id}
              className="absolute -top-5 right-0 text-[#F59E0B] text-sm font-extrabold score-float pointer-events-none font-mono"
            >
              +{pts}
            </span>
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="p-6 rounded-2xl bg-[#13131A] border border-[#7C3AED]/25 shadow-[0_0_25px_rgba(124,58,237,0.1)] mb-6 min-h-[130px] flex items-center justify-center text-center">
        <h2 className="text-base font-semibold text-[#F1F1F3] leading-relaxed">
          {currentQ.question}
        </h2>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-1 gap-3">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = correctIdx === idx;
          const isWrong = isSelected && correctIdx !== null && correctIdx !== idx;

          let cls = "bg-[#13131A] border-[#2B2B3D] text-gray-200 hover:border-[#7C3AED] hover:bg-[#7C3AED]/10";
          let badge = "";
          if (isAnswering) {
            if (isCorrect) {
              cls = "bg-[#10B981]/15 border-[#10B981] text-[#10B981]";
              badge = "✅";
            } else if (isWrong) {
              cls = "bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444]";
              badge = "❌";
            } else {
              cls = "bg-[#13131A] border-[#1F1F2E] text-gray-500 opacity-50";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              disabled={isAnswering}
              style={{ minHeight: 54 }}
              className={`btn-press w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 text-left ${cls}`}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 font-mono"
                style={{
                  background: isAnswering && isCorrect ? "#10B981" : isAnswering && isWrong ? "#EF4444" : "#1F1F2E",
                  color: isAnswering && (isCorrect || isWrong) ? "white" : "#A78BFA",
                }}
              >
                {OPTION_LABELS[idx]}
              </span>
              <span className="flex-1 leading-snug">{opt}</span>
              {badge && <span className="text-lg">{badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TriviaGame;
