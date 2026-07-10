import React, { useState } from "react";
import { WordPotLobby } from "../components/wordPot/WordPotLobby";
import { WordPotGame } from "../components/wordPot/WordPotGame";
import { WordPotResults } from "../components/wordPot/WordPotResults";
import { WordPotPractice } from "../components/wordPot/WordPotPractice";
import { DailyWordPotGame } from "../components/wordPot/DailyWordPotGame";

interface WordPotPageProps {
  onShowRipple: () => void;
  onExit: () => void;
}

export function WordPotPage({ onShowRipple, onExit }: WordPotPageProps) {
  const [view, setView] = useState<"lobby" | "game" | "results" | "practice" | "daily">("lobby");
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  const [activeEntryFee, setActiveEntryFee] = useState<string>("0");
  const [activePoolBalance, setActivePoolBalance] = useState<string>("0");
  const [activePlayerCount, setActivePlayerCount] = useState<number>(0);
  const [activeCurrency, setActiveCurrency] = useState<"USDT" | "NIM">("USDT");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);

  const handleStartWordPot = (roundId: number, entryFee: string, poolBalance: string, playerCount: number, currency: "USDT"|"NIM") => {
    setActiveRoundId(roundId);
    setActiveEntryFee(entryFee);
    setActivePoolBalance(poolBalance);
    setActivePlayerCount(playerCount);
    setActiveCurrency(currency);
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
          onStartPractice={() => setView("practice")}
          onStartDaily={() => setView("daily")}
        />
      )}

      {view === "game" && activeRoundId !== null && (
        <WordPotGame
          roundId={activeRoundId}
          entryFee={activeEntryFee}
          poolBalance={activePoolBalance}
          playerCount={activePlayerCount}
          currency={activeCurrency}
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

      {view === "practice" && (
        <WordPotPractice
          onExit={handleExit}
          onChallengeReal={() => setView("lobby")}
        />
      )}

      {view === "daily" && (
        <DailyWordPotGame
          onExit={handleExit}
          onShowRipple={onShowRipple}
        />
      )}
    </div>
  );
}
export default WordPotPage;
