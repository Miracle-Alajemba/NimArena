import React, { useEffect, useState } from "react";
import { GameCard } from "./GameCard";
import { Gamepad2, Award, Zap, Hash, Smile } from "lucide-react";
import { useApi } from "../../hooks/useApi";

interface GameGridProps {
  onSelectGame: (game: "word_duel" | "speed_trivia") => void;
}

export function GameGrid({ onSelectGame }: GameGridProps) {
  const { get } = useApi();
  const [openDuelsCount, setOpenDuelsCount] = useState<number>(0);
  const [activeRoundsCount, setActiveRoundsCount] = useState<number>(0);
  const [triviaPrizePool, setTriviaPrizePool] = useState<string>("0.00");
  const [duelPrizePool, setDuelPrizePool] = useState<string>("0.00");

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch open duels from backend
        const duels = await get("/api/duels/open");
        setOpenDuelsCount(duels.length);
        
        // Calculate duel prize pool (sum of fee * 2 for queued matches)
        let totalDuelPrize = 0;
        for (const d of duels) {
          const entryVal = parseFloat(d.entryFee);
          if (!isNaN(entryVal)) {
            totalDuelPrize += entryVal * 2;
          }
        }
        setDuelPrizePool(totalDuelPrize.toFixed(2));

        // Fetch active trivia rounds from backend
        const rounds = await get("/api/trivia/rounds");
        setActiveRoundsCount(rounds.length);

        // Calculate total trivia prize pools
        let totalTriviaPrize = 0;
        for (const r of rounds) {
          const poolVal = parseFloat(r.poolBalance);
          if (!isNaN(poolVal)) {
            totalTriviaPrize += poolVal;
          }
        }
        setTriviaPrizePool(totalTriviaPrize.toFixed(2));
      } catch (err) {
        console.warn("LobbyStats: Failed to fetch active stats from backend.", err);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, [get]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-4 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
      {/* Word Duel Card */}
      <GameCard
        title="Word Duel"
        description="Fast 1v1 word commit-reveal battle. Longer word wins the pool."
        status="live"
        details={`${openDuelsCount} open • ${duelPrizePool} USDT Pot`}
        onClick={() => onSelectGame("word_duel")}
        icon={<Gamepad2 className="w-5 h-5" />}
      />

      {/* Speed Trivia Card */}
      <GameCard
        title="Speed Trivia"
        description="10-question rapid multiple choice test. High scorer takes pool."
        status="live"
        details={`${activeRoundsCount} rounds • ${triviaPrizePool} USDT`}
        onClick={() => onSelectGame("speed_trivia")}
        icon={<Award className="w-5 h-5" />}
      />

      {/* Number Rush Placeholder */}
      <GameCard
        title="Number Rush"
        description="Real-time sequence clicking contest. (Coming Soon)"
        status="coming_soon"
        details="Coming soon"
        icon={<Hash className="w-5 h-5" />}
      />

      {/* Emoji Guess Placeholder */}
      <GameCard
        title="Emoji Guess"
        description="Speed decoding of encrypted emojis. (Coming Soon)"
        status="coming_soon"
        details="Coming soon"
        icon={<Smile className="w-5 h-5" />}
      />
    </div>
  );
}
export default GameGrid;
