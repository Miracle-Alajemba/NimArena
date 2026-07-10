import React, { useState } from "react";
import Header from "../components/layout/Header";
import { WordDuelLobby } from "../components/wordDuel/WordDuelLobby";
import { WordDuelGame } from "../components/wordDuel/WordDuelGame";
import { WordDuelResults } from "../components/wordDuel/WordDuelResults";
import { DailyChallengeGame } from "../components/wordDuel/DailyChallengeGame";
import { WordDuelPractice } from "../components/wordDuel/WordDuelPractice";

interface WordDuelPageProps {
  onShowRipple: () => void;
  onExit: () => void;
}

type WordDuelScreen = "lobby" | "playing" | "results";

export function WordDuelPage({ onShowRipple, onExit }: WordDuelPageProps) {
  const [screen, setScreen] = useState<WordDuelScreen>("lobby");
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [selectedEntryFee, setSelectedEntryFee] = useState<string>("0.5");
  const [sessionId, setSessionId] = useState<string>("");
  const [finalScore, setFinalScore] = useState<number>(0);

  // Daily challenge and Practice toggles
  const [isDailyActive, setIsDailyActive] = useState<boolean>(false);
  const [isPracticeActive, setIsPracticeActive] = useState<boolean>(false);

  const handleStartWordDuel = (roundId: number, entryFee: string) => {
    setSelectedRoundId(roundId);
    setSelectedEntryFee(entryFee);
    setScreen("playing");
  };

  const handleGameComplete = (sessId: string, score: number, proof: string) => {
    setSessionId(sessId);
    setFinalScore(score);
    setScreen("results");
  };

  const handleExit = () => {
    setScreen("lobby");
    setSelectedRoundId(null);
    onExit();
  };

  const handleDailyComplete = () => {
    setIsDailyActive(false);
    onShowRipple();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      {/* Header */}
      <Header onBack={onExit} />

      {isDailyActive ? (
        <DailyChallengeGame
          onComplete={handleDailyComplete}
          onExit={() => setIsDailyActive(false)}
          onShowRipple={onShowRipple}
        />
      ) : isPracticeActive ? (
        <div className="flex-1 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4">
          <WordDuelPractice 
            onExit={() => setIsPracticeActive(false)} 
            onChallengeReal={() => setIsPracticeActive(false)} 
          />
        </div>
      ) : (
        <>
          {screen === "lobby" && (
            <WordDuelLobby 
              onStartWordDuel={handleStartWordDuel} 
              onStartPractice={() => setIsPracticeActive(true)}
              onStartDaily={() => setIsDailyActive(true)}
            />
          )}

          {screen === "playing" && selectedRoundId && (
            <WordDuelGame
              roundId={selectedRoundId}
              entryFee={selectedEntryFee}
              onComplete={handleGameComplete}
              onExit={handleExit}
            />
          )}

          {screen === "results" && selectedRoundId && (
            <WordDuelResults
              roundId={selectedRoundId}
              sessionId={sessionId}
              score={finalScore}
              onExit={handleExit}
              onShowRipple={onShowRipple}
            />
          )}
        </>
      )}
    </div>
  );
}
export default WordDuelPage;
