import React from "react";
import { Swords, Trophy, Flame } from "lucide-react";

interface GameLobbyProps {
  onSelectGame: (game: "word_duel" | "speed_trivia" | "word_pot") => void;
}

export function GameLobby({ onSelectGame }: GameLobbyProps) {
  const games = [
    {
      id: "speed_trivia" as const,
      title: "Speed Trivia",
      category: "Knowledge & Speed",
      players: "1 - 100 Players",
      fee: "0.5 USDT / 5 NIM",
      color: "from-[#7C3AED]/20 to-[#7C3AED]/5 border-[#7C3AED]/50",
      accent: "#7C3AED",
      icon: <Trophy className="w-8 h-8 text-[#F59E0B]" />,
      desc: "Answer 10 fast-paced trivia questions with 10s timers.",
    },
    {
      id: "word_pot" as const,
      title: "Word Pot",
      category: "Shared Tile Arena",
      players: "Multiplayer Pool",
      fee: "1.0 USDT / 10 NIM",
      color: "from-[#10B981]/20 to-[#10B981]/5 border-[#10B981]/50",
      accent: "#10B981",
      icon: <Flame className="w-8 h-8 text-[#10B981]" />,
      desc: "All players share 7 letter tiles in a 60-second pot battle.",
    },
    {
      id: "word_duel" as const,
      title: "Word Duel",
      category: "Anagram Speed Battle",
      players: "1v1 Duel Mode",
      fee: "1.0 USDT / 10 NIM",
      color: "from-[#3B82F6]/20 to-[#3B82F6]/5 border-[#3B82F6]/50",
      accent: "#3B82F6",
      icon: <Swords className="w-8 h-8 text-[#3B82F6]" />,
      desc: "Solve 7 scrambled letters & outscore your opponent in 60s.",
    },
  ];

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto px-4 pt-4 pb-12">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-white font-display uppercase tracking-wide">
          Select Your Arena
        </h1>
        <p className="text-xs text-gray-400 font-mono mt-1">
          Compete in skill games to win real rewards on Nimiq & Base.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className={`p-5 rounded-2xl bg-gradient-to-br ${game.color} border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-xl flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#13131A] border border-[#2B2B3D]">
                {game.icon}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-gray-400">
                  {game.category}
                </span>
                <h3 className="text-lg font-extrabold text-white font-display uppercase tracking-wide">
                  {game.title}
                </h3>
                <p className="text-xs text-gray-300 mt-0.5">{game.desc}</p>
                <div className="flex gap-3 mt-2 text-[10px] font-mono text-gray-400">
                  <span>👥 {game.players}</span>
                  <span className="text-[#F59E0B]">💰 {game.fee}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameLobby;
