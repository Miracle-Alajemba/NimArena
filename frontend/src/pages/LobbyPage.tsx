import React from "react";
import Header from "../components/layout/Header";
import GameGrid from "../components/lobby/GameGrid";

interface LobbyPageProps {
  onSelectGame: (game: "word_duel" | "speed_trivia") => void;
}

export function LobbyPage({ onSelectGame }: LobbyPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      {/* Header Layout */}
      <Header />

      {/* Hero Welcome Info */}
      <div className="text-center px-6 pt-8 pb-4 max-w-md mx-auto glow-bg">
        <h1 className="text-2xl font-extrabold tracking-tight text-white font-display uppercase leading-tight">
          Battle for <span className="text-[#7C3AED]">USDT Stakes</span>
        </h1>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          The skill-based game arena on Base chain. Connect instantly via Nimiq Pay wallet and start winning payouts.
        </p>
      </div>

      {/* Game Cards Grid */}
      <GameGrid onSelectGame={onSelectGame} />
    </div>
  );
}
export default LobbyPage;
