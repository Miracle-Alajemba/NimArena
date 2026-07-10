import React, { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { useNimiq } from "../../hooks/useNimiq";
import { PremiumLoader } from "../layout/PremiumLoader";

interface TriviaGameProps {
  roundId: number;
  entryFee: string;
  onComplete: (sessionId: string, score: number) => void;
  onExit: () => void;
}

interface QuestionData {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  category: string;
  difficulty: string;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function TriviaGame({ roundId, entryFee, onComplete, onExit }: TriviaGameProps) {
  const { post, get } = useApi();
  const { walletAddress } = useNimiq();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [score, setScore] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(30000);
  const timerRef = useRef<any>(null);
  const startTimestampRef = useRef<number>(0);

  // Score float-ups
  const [floatPts, setFloatPts] = useState<{ id: number; pts: number }[]>([]);
  const [floatCounter, setFloatCounter] = useState(0);

  useEffect(() => {
    async function startSession() {
      if (!walletAddress) return;
      try {
        const res = await post("/api/trivia/session/start", {
          roundId,
          walletAddress: walletAddress.toLowerCase(),
        });
        setSessionId(res.sessionId);
      } catch {
        alert("Session setup failed. Ensure backend server is running.");
        onExit();
      }
    }
    startSession();
  }, [roundId, walletAddress]);

  useEffect(() => {
    if (!sessionId) return;
    async function fetchQuestion() {
      setLoading(true);
      setSelectedIdx(null);
      setCorrectIdx(null);
      setIsAnswering(false);
      setTimeLeftMs(30000);
      try {
        const qData = await get(`/api/trivia/session/${sessionId}/question/${currentQIndex}`);
        setQuestion(qData);
        startTimestampRef.current = Date.now();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimestampRef.current;
          const remaining = Math.max(0, 30000 - elapsed);
          setTimeLeftMs(remaining);
          if (remaining === 0) handleOptionSelect(-1);
        }, 100);
        setLoading(false);
      } catch (err) {
        console.error("TriviaGame: Failed to fetch question:", err);
      }
    }
    fetchQuestion();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionId, currentQIndex]);

  const handleOptionSelect = async (optIdx: number) => {
    if (isAnswering || !sessionId) return;
    setIsAnswering(true);
    setSelectedIdx(optIdx);
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Date.now() - startTimestampRef.current;
    const finalTimeRemaining = Math.max(0, 30000 - elapsed);
    try {
      const res = await post(`/api/trivia/session/${sessionId}/answer`, {
        answerIndex: optIdx,
        timeRemainingMs: finalTimeRemaining,
      });
      setCorrectIdx(res.correctIndex);
      const newScore = res.totalScore;
      if (newScore > score) {
        const gained = newScore - score;
        const id = floatCounter + 1;
        setFloatCounter(id);
        setFloatPts((p) => [...p, { id, pts: gained }]);
        setTimeout(() => setFloatPts((p) => p.filter((x) => x.id !== id)), 1400);
      }
      setScore(newScore);
      setTimeout(() => {
        if (currentQIndex < 9) setCurrentQIndex((p) => p + 1);
        else onComplete(sessionId, res.totalScore);
      }, 1800);
    } catch {
      setIsAnswering(false);
    }
  };

  if (loading && !question) return <PremiumLoader text="Preparing question..." />;

  const options = [question?.optionA, question?.optionB, question?.optionC, question?.optionD];
  const progressPercent = (timeLeftMs / 30000) * 100;
  const isCritical = timeLeftMs < 10000;
  const isWarning = timeLeftMs < 20000;

  return (
    <div className="pb-24 px-4 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-5 page-fade-in">
      {/* Top timer bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden mb-5 bg-[#1A1A24]">
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
            className="text-sm font-bold text-[#A78BFA] uppercase tracking-wider"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Question {currentQIndex + 1} of 10 ⚡
          </span>
          <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{question?.category}</div>
        </div>

        {/* Score */}
        <div className="relative flex flex-col items-end">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score ⚡</span>
          <span
            className="text-2xl font-extrabold text-[#F59E0B]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {score}
          </span>
          {floatPts.map(({ id, pts }) => (
            <span
              key={id}
              className="absolute -top-5 right-0 text-[#F59E0B] text-sm font-extrabold score-float pointer-events-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              +{pts}
            </span>
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="p-6 rounded-2xl bg-[#13131A] border border-[#7C3AED]/25 shadow-[0_0_25px_rgba(124,58,237,0.1)] mb-6 min-h-[130px] flex items-center justify-center text-center">
        <h2 className="text-base font-semibold text-[#F1F1F3] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
          {question?.question}
        </h2>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, idx) => {
          if (!opt) return null;
          const isSelected = selectedIdx === idx;
          const isCorrect = correctIdx === idx;
          const isWrong = isSelected && correctIdx !== null && correctIdx !== idx;

          let cls = "bg-[#13131A] border-[#2B2B3D] text-gray-200 hover:border-[#7C3AED] hover:bg-[#7C3AED]/10";
          let badge = "";
          if (isAnswering) {
            if (isCorrect) { cls = "bg-[#10B981]/15 border-[#10B981] text-[#10B981]"; badge = "✅"; }
            else if (isWrong) { cls = "bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444]"; badge = "❌"; }
            else cls = "bg-[#13131A] border-[#1F1F2E] text-gray-500 opacity-50";
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              disabled={isAnswering}
              style={{ minHeight: 56 }}
              className={`btn-press w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 text-left ${cls}`}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
                style={{
                  background: isAnswering && isCorrect ? "#10B981" : isAnswering && isWrong ? "#EF4444" : "#1F1F2E",
                  color: isAnswering && (isCorrect || isWrong) ? "white" : "#A78BFA",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {OPTION_LABELS[idx]}
              </span>
              <span className="flex-1 leading-snug" style={{ fontFamily: "'Inter', sans-serif" }}>{opt}</span>
              {badge && <span className="text-lg">{badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default TriviaGame;
