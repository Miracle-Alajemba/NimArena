import React, { useState } from "react";
import { WordPotLobby } from "../components/wordPot/WordPotLobby";
import { WordPotGame } from "../components/wordPot/WordPotGame";
import { WordPotResults } from "../components/wordPot/WordPotResults";

interface WordPotPageProps {
  onShowRipple: () => void;
  onExit: () => void;
}

export function WordPotPage({ onShowRipple, onExit }: WordPotPageProps) {
  const [view, setView] = useState<"lobby" | "game" | "results">("lobby");
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  const [activeEntryFee, setActiveEntryFee] = useState<string>("0");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);

  const handleStartWordPot = (roundId: number, entryFee: string) => {
    setActiveRoundId(roundId);
    setActiveEntryFee(entryFee);
    setView("game");
  };

  const handleGameComplete = (sid: string, score: number, proof: string) => {
    setSessionId(sid);
    setFinalScore(score);
    setView("results");
  };

  const handleExit = () => {
    setView("lobby");
    setActiveRoundId(null);
    setSessionId(null);
    setFinalScore(0);
  };

  return (
    <div className="w-full">
      {view === "lobby" && (
        <WordPotLobby
          onStartWordPot={handleStartWordPot}
        />
      )}

      {view === "game" && activeRoundId !== null && (
        <WordPotGame
          roundId={activeRoundId}
          entryFee={activeEntryFee}
          onComplete={handleGameComplete}
          onExit={handleExit}
        />
      )}

      {view === "results" && activeRoundId !== null && sessionId !== null && (
        <WordPotResults
          roundId={activeRoundId}
          sessionId={sessionId}
          score={finalScore}
          onExit={handleExit}
          onShowRipple={onShowRipple}
        />
      )}
    </div>
  );
}
export default WordPotPage;
