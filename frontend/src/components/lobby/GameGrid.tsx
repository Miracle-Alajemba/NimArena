import React, { useEffect, useState } from "react";
import { GameCard } from "./GameCard";
import { Gamepad2, Award, Zap, Hash, Smile } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { USDT_ADDRESS } from "../../config/constants";
import { formatToken } from "../../lib/formatters";

interface GameGridProps {
  onSelectGame: (game: "word_duel" | "speed_trivia" | "practice_arena") => void;
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
        let totalDuelUSDT = 0;
        let totalDuelNIM = 0;
        for (const d of duels) {
          if (d.tokenAddress && d.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const entryVal = parseFloat(formatToken(d.entryFee, 6));
            if (!isNaN(entryVal)) totalDuelUSDT += entryVal * 2;
          } else {
            const entryVal = parseFloat(formatToken(d.entryFee, 18));
            if (!isNaN(entryVal)) totalDuelNIM += entryVal * 2;
          }
        }
        
        let duelPrizeStr = "";
        if (totalDuelUSDT > 0) duelPrizeStr += `${totalDuelUSDT.toFixed(2)} USDT Pot `;
        if (totalDuelNIM > 0) duelPrizeStr += `${totalDuelNIM.toFixed(2)} NIM Pot`;
        if (!duelPrizeStr) duelPrizeStr = "0.00 USDT Pot";
        setDuelPrizePool(duelPrizeStr.trim());

        // Fetch active trivia rounds from backend
        const rounds = await get("/api/trivia/rounds");
        setActiveRoundsCount(rounds.length);

        // Calculate total trivia prize pools
        let totalTriviaUSDT = 0;
        let totalTriviaNIM = 0;
        for (const r of rounds) {
          if (r.tokenAddress && r.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const poolVal = parseFloat(formatToken(r.poolBalance, 6));
            if (!isNaN(poolVal)) totalTriviaUSDT += poolVal;
          } else {
            const poolVal = parseFloat(formatToken(r.poolBalance, 18));
            if (!isNaN(poolVal)) totalTriviaNIM += poolVal;
          }
        }
        
        let triviaPrizeStr = "";
        if (totalTriviaUSDT > 0) triviaPrizeStr += `${totalTriviaUSDT.toFixed(2)} USDT Pot `;
        if (totalTriviaNIM > 0) triviaPrizeStr += `${totalTriviaNIM.toFixed(2)} NIM Pot`;
        if (!triviaPrizeStr) triviaPrizeStr = "0.00 USDT Pot";
        setTriviaPrizePool(triviaPrizeStr.trim());
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
        details={`${openDuelsCount} open • ${duelPrizePool}`}
        onClick={() => onSelectGame("word_duel")}
        icon={<Gamepad2 className="w-5 h-5" />}
      />

      {/* Speed Trivia Card */}
      <GameCard
        title="Speed Trivia"
        description="10-question rapid multiple choice test. High scorer takes pool."
        status="live"
        details={`${activeRoundsCount} rounds • ${triviaPrizePool}`}
        onClick={() => onSelectGame("speed_trivia")}
        icon={<Award className="w-5 h-5" />}
      />

      {/* Practice Arena Card */}
      <div 
        onClick={() => onSelectGame("practice_arena")}
        className="relative overflow-hidden rounded-2xl bg-[#0A0A0F] border-2 border-[#10B981]/50 cursor-pointer group hover:border-[#10B981] transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
      >
        <div className="absolute top-0 right-0 px-3 py-1 bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold rounded-bl-lg font-mono">
          FREE — No Wallet Needed
        </div>
        
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/30">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-white text-lg tracking-wide group-hover:text-[#10B981] transition-colors">
                PRACTICE ARENA
              </h3>
              <p className="text-[#10B981]/80 text-xs font-mono">Warm up your vocabulary</p>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm mb-4">
            Test your skills without risking any tokens. Try to get the longest word in 60 seconds!
          </p>
          
          <div className="flex items-center justify-between border-t border-[#1F1F2E] pt-3">
             <div className="text-xs text-gray-500 font-medium">Single Player</div>
             <div className="flex items-center gap-1 text-[#10B981] text-xs font-bold bg-[#10B981]/10 px-2 py-1 rounded">
               Play Now <span className="text-[10px]">→</span>
             </div>
          </div>
        </div>
      </div>

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
