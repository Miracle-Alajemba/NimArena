import React, { useEffect, useState } from "react";
import { GameCard } from "./GameCard";
import { useApi } from "../../hooks/useApi";
import { USDT_ADDRESS } from "../../config/constants";
import { formatToken } from "../../lib/formatters";

interface GameGridProps {
  onSelectGame: (game: "word_duel" | "speed_trivia" | "word_pot") => void;
}

export function GameGrid({ onSelectGame }: GameGridProps) {
  const { get } = useApi();
  const [openDuelsCount, setOpenDuelsCount] = useState<number>(0);
  const [activeRoundsCount, setActiveRoundsCount] = useState<number>(0);
  const [triviaPrizePool, setTriviaPrizePool] = useState<string>("0.00");
  const [duelPrizePool, setDuelPrizePool] = useState<string>("0.00");
  const [wordPotRoundsCount, setWordPotRoundsCount] = useState<number>(0);
  const [wordPotPrizePool, setWordPotPrizePool] = useState<string>("0.00");

  useEffect(() => {
    async function fetchStats() {
      try {
        const duelsData = await get("/api/duels/open");
        const duels = Array.isArray(duelsData) ? duelsData : [];
        setOpenDuelsCount(duels.length);

        let totalDuelUSDT = 0;
        for (const d of duels) {
          if (d.tokenAddress && d.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const v = parseFloat(formatToken(d.entryFee, 6));
            if (!isNaN(v)) totalDuelUSDT += v * 2;
          }
        }
        setDuelPrizePool(totalDuelUSDT > 0 ? `${totalDuelUSDT.toFixed(2)} USDT` : "0.00 USDT");

        const roundsData = await get("/api/trivia/rounds");
        const rounds = Array.isArray(roundsData) ? roundsData : [];
        setActiveRoundsCount(rounds.length);

        let totalTriviaUSDT = 0;
        for (const r of rounds) {
          if (r.tokenAddress && r.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const v = parseFloat(formatToken(r.poolBalance, 6));
            if (!isNaN(v)) totalTriviaUSDT += v;
          }
        }
        setTriviaPrizePool(totalTriviaUSDT > 0 ? `${totalTriviaUSDT.toFixed(2)} USDT` : "0.00 USDT");

        const potRoundsData = await get("/api/word-pot/rounds");
        const potRounds = Array.isArray(potRoundsData) ? potRoundsData : [];
        setWordPotRoundsCount(potRounds.length);

        let totalPotUSDT = 0;
        for (const r of potRounds) {
          if (r.tokenAddress && r.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const v = parseFloat(formatToken(r.poolBalance, 6));
            if (!isNaN(v)) totalPotUSDT += v;
          }
        }
        setWordPotPrizePool(totalPotUSDT > 0 ? `${totalPotUSDT.toFixed(2)} USDT` : "0.00 USDT");
      } catch (err) {
        console.warn("LobbyStats: Failed to fetch stats.", err);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, [get]);

  return (
    <div className="px-5 py-4 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto page-fade-in">
      {/* Section header */}
      <div className="mb-5">
        <h2
          className="text-xl font-semibold text-white uppercase mb-1"
          style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em", fontWeight: 600 }}
        >
          CHOOSE YOUR ARENA
        </h2>
        <p className="text-xs text-gray-500 font-body">
          Compete, earn, and prove your skills on-chain
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Word Pot */}
        <GameCard
          title="Word Pot"
          description="All players share the same letters. Compare words fairly under identical conditions. Highest score takes the pot!"
          status="live"
          emoji="🏺"
          prize={wordPotPrizePool}
          players={`${wordPotRoundsCount} rounds`}
          onClick={() => onSelectGame("word_pot")}
          accentColor="#F59E0B"
        />

        {/* Word Duel */}
        <GameCard
          title="Word Duel"
          description="Form words from a scrambled letter set. Beat the clock and outscore rivals to claim the prize pool."
          status="live"
          emoji="⚔️"
          prize={duelPrizePool}
          players={`${openDuelsCount} open`}
          onClick={() => onSelectGame("word_duel")}
          accentColor="#7C3AED"
        />

        {/* Speed Trivia */}
        <GameCard
          title="Speed Trivia"
          description="10 rapid-fire questions. Fastest correct answers score highest. Top scorer takes the pot."
          status="live"
          emoji="⚡"
          prize={triviaPrizePool}
          players={`${activeRoundsCount} rounds`}
          onClick={() => onSelectGame("speed_trivia")}
          accentColor="#10B981"
        />

        {/* Number Rush */}
        <GameCard
          title="Number Rush"
          description="Real-time sequence clicking contest. React faster than your opponents to win."
          status="coming_soon"
          emoji="🔢"
          accentColor="#4F6EF7"
        />
      </div>
    </div>
  );
}
export default GameGrid;
