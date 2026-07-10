import React, { useState } from "react";
import Header from "../components/layout/Header";
import { TriviaLobby } from "../components/trivia/TriviaLobby";
import { TriviaGame } from "../components/trivia/TriviaGame";
import { TriviaResults } from "../components/trivia/TriviaResults";
import { TriviaPractice } from "../components/trivia/TriviaPractice";

interface SpeedTriviaPageProps {
  onShowRipple: () => void;
  onExit: () => void;
}

type TriviaScreen = "lobby" | "playing" | "results";

export function SpeedTriviaPage({ onShowRipple, onExit }: SpeedTriviaPageProps) {
  const [screen, setScreen] = useState<TriviaScreen>("lobby");
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [selectedEntryFee, setSelectedEntryFee] = useState<string>("0.5");
  const [sessionId, setSessionId] = useState<string>("");
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isPracticeActive, setIsPracticeActive] = useState<boolean>(false);

  const handleStartTrivia = (roundId: number, entryFee: string) => {
    setSelectedRoundId(roundId);
    setSelectedEntryFee(entryFee);
    setScreen("playing");
  };

  const handleGameComplete = (sessId: string, score: number) => {
    setSessionId(sessId);
    setFinalScore(score);
    setScreen("results");
  };

  const handleExit = () => {
    setScreen("lobby");
    setSelectedRoundId(null);
    onExit();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      {/* Header */}
      <Header onBack={onExit} />

      {isPracticeActive ? (
        <div className="flex-1 w-full flex flex-col pt-4 pb-24">
          <TriviaPractice
            onExit={() => setIsPracticeActive(false)}
            onChallengeReal={() => setIsPracticeActive(false)}
          />
        </div>
      ) : (
        <>
          {screen === "lobby" && (
            <TriviaLobby
              onStartTrivia={handleStartTrivia}
              onStartPractice={() => setIsPracticeActive(true)}
            />
          )}

          {screen === "playing" && selectedRoundId && (
            <TriviaGame
              roundId={selectedRoundId}
              entryFee={selectedEntryFee}
              onComplete={handleGameComplete}
              onExit={handleExit}
            />
          )}

          {screen === "results" && selectedRoundId && (
            <TriviaResults
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
export default SpeedTriviaPage;
