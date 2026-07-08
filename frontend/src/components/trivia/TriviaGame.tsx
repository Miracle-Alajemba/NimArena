

import React, { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { useNimiq } from "../../hooks/useNimiq";
import { Timer, AlertTriangle, Zap, CheckCircle2, XCircle } from "lucide-react";

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

export function TriviaGame({ roundId, entryFee, onComplete, onExit }: TriviaGameProps) {
  const { post, get } = useApi();
  const { walletAddress } = useNimiq();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [score, setScore] = useState<number>(0);

  // Gameplay states
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);

  // Timer State (30 seconds)
  const [timeLeftMs, setTimeLeftMs] = useState<number>(30000);
  const timerRef = useRef<any>(null);
  const startTimestampRef = useRef<number>(0);

  // Initialize session
  useEffect(() => {
    async function startSession() {
      try {
        if (!walletAddress) return;
        const res = await post("/api/trivia/session/start", {
          roundId,
          walletAddress: walletAddress.toLowerCase()
        });
        setSessionId(res.sessionId);
      } catch (err) {
        console.error("TriviaGame: Failed to start session:", err);
        alert("Matchmaking/Session setup failed. Ensure backend server is running.");
        onExit();
      }
    }

    startSession();
  }, [roundId, walletAddress, post, onExit]);

  // Fetch question details on index change
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

        // Start Timer
        startTimestampRef.current = Date.now();
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimestampRef.current;
          const remaining = Math.max(0, 30000 - elapsed);
          setTimeLeftMs(remaining);

          if (remaining === 0) {
            // Auto fail this question if time expires
            handleOptionSelect(-1);
          }
        }, 100);

        setLoading(false);
      } catch (err) {
        console.error("TriviaGame: Failed to fetch question:", err);
      }
    }

    fetchQuestion();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId, currentQIndex]);

  const handleOptionSelect = async (optIdx: number) => {
    if (isAnswering || !sessionId) return;
    setIsAnswering(true);
    setSelectedIdx(optIdx);

    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Date.now() - startTimestampRef.current;
    const finalTimeRemaining = Math.max(0, 30000 - elapsed);

    try {
      // Submit answer to backend
      const res = await post(`/api/trivia/session/${sessionId}/answer`, {
        answerIndex: optIdx,
        timeRemainingMs: finalTimeRemaining
      });

      setCorrectIdx(res.correctIndex);
      setScore(res.totalScore);

      // Wait 2.2 seconds then move to next question or complete
      setTimeout(() => {
        if (currentQIndex < 9) {
          setCurrentQIndex(prev => prev + 1);
        } else {
          // Finalize session
          onComplete(sessionId, res.totalScore);
        }
      }, 2200);
    } catch (err) {
      console.error("TriviaGame: Failed to submit answer:", err);
      setIsAnswering(false);
    }
  };

  if (loading && !question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
        <span className="text-sm font-extrabold uppercase tracking-wider">Readying Question...</span>
      </div>
    );
  }

  const options = [
    question?.optionA,
    question?.optionB,
    question?.optionC,
    question?.optionD,
  ];

  // Timer colors (warning colors when low)
  const isTimeCritical = timeLeftMs < 10000;
  const progressPercent = (timeLeftMs / 30000) * 100;

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-6">
      {/* Upper Status Row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold uppercase text-[#7C3AED] tracking-wider font-mono">
            Question {currentQIndex + 1} of 10
          </span>
          <span className="text-xs font-bold text-gray-400 font-mono mt-0.5">
            Category: {question?.category}
          </span>
        </div>

        {/* Live Score */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
            Total Score
          </span>
          <span className="text-base font-extrabold text-[#F59E0B] font-mono">
            {score}
          </span>
        </div>
      </div>

      {/* Radial/Bar Timer */}
      <div className="w-full bg-[#1A1A24] h-2.5 rounded-full overflow-hidden mb-8 border border-[#2B2B3D]">
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full transition-all duration-100 ${isTimeCritical ? "bg-[#EF4444] animate-pulse" : "bg-[#7C3AED]"
            }`}
        />
      </div>

      {/* Timer details */}
      <div className="flex items-center gap-1.5 justify-center mb-8">
        <Timer className={`w-4 h-4 ${isTimeCritical ? "text-[#EF4444] animate-bounce" : "text-gray-400"}`} />
        <span className={`text-sm font-bold font-mono ${isTimeCritical ? "text-[#EF4444]" : "text-gray-300"}`}>
          {(timeLeftMs / 1000).toFixed(1)}s remaining
        </span>
      </div>

      {/* Question Card */}
      <div className="p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 shadow-lg min-h-[140px] flex items-center justify-center text-center">
        <h2 className="text-base font-bold text-[#F1F1F3] font-body leading-relaxed">
          {question?.question}
        </h2>
      </div>

      {/* Answers Options Grid */}
      <div className="flex flex-col gap-3">
        {options.map((opt, idx) => {
          if (!opt) return null;

          const isSelected = selectedIdx === idx;
          const isCorrect = correctIdx === idx;
          const isWrong = isSelected && correctIdx !== null && correctIdx !== idx;

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
export default TriviaGame;
