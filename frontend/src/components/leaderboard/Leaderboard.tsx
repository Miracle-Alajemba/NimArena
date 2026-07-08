import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useNimiq } from "../../hooks/useNimiq";
import { truncateAddress, formatUSDT } from "../../lib/formatters";
import { Trophy, Star, ShieldAlert } from "lucide-react";

interface LeaderboardRecord {
  rank: number;
  walletAddress: string;
  wins: number;
  totalEarned: string;
  lastWinAt: string | null;
}

export function Leaderboard() {
  const { get } = useApi();
  const { walletAddress } = useNimiq();

  const [game, setGame] = useState<"word_duel" | "speed_trivia">("word_duel");
  const [period, setPeriod] = useState<"today" | "alltime">("alltime");
  
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [playerRecord, setPlayerRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      try {
        const queryParams = `?period=${period}${walletAddress ? `&playerAddress=${walletAddress}` : ""}`;
        const data = await get(`/api/leaderboard/${game}${queryParams}`);
        
        setRecords(data.leaderboard || []);
        setPlayerRecord(data.playerRank || null);
      } catch (err) {
        console.error("LeaderboardUI: Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [game, period, walletAddress, get]);

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4">
      {/* Tab Title */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-[#F59E0B]" />
        <h2 className="text-xl font-extrabold tracking-wide text-white font-display uppercase">
          Leaderboard
        </h2>
      </div>

      {/* Game Selector */}
      <div className="flex gap-2 p-1 bg-[#13131A] border border-[#1F1F2E] rounded-xl mb-4">
        <button
          onClick={() => setGame("word_duel")}
          style={{ minHeight: "44px" }}
          className={`flex-1 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
            game === "word_duel"
              ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Word Duel
        </button>
        <button
          onClick={() => setGame("speed_trivia")}
          style={{ minHeight: "44px" }}
          className={`flex-1 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
            game === "speed_trivia"
              ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Speed Trivia
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-[#13131A]/50 border border-[#1F1F2E]/80 rounded-xl mb-6">
        <button
          onClick={() => setPeriod("alltime")}
          style={{ minHeight: "36px" }}
          className={`flex-1 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
            period === "alltime"
              ? "bg-[#1A1A24] text-white border border-[#2B2B3D]"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          All-time
        </button>
        <button
          onClick={() => setPeriod("today")}
          style={{ minHeight: "36px" }}
          className={`flex-1 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
            period === "today"
              ? "bg-[#1A1A24] text-white border border-[#2B2B3D]"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Today
        </button>
      </div>

      {/* Rankings List */}
      <div className="rounded-2xl bg-[#13131A] border border-[#1F1F2E] overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading rankings...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-2">
            <Star className="w-8 h-8 opacity-20" />
            <span className="text-xs font-bold uppercase tracking-wider">No matches logged yet</span>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F2E]">
            {/* Header row */}
            <div className="flex justify-between items-center px-4 py-3 bg-[#1A1A24]/40 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
              <div className="flex items-center gap-4">
                <span className="w-6 text-center">Rank</span>
                <span>Player</span>
              </div>
              <div className="flex gap-10">
                <span className="w-10 text-center">Wins</span>
                <span className="w-16 text-right">Prize</span>
              </div>
            </div>

            {/* Records */}
            {records.map((entry) => {
              const isSelf = walletAddress && entry.walletAddress.toLowerCase() === walletAddress.toLowerCase();
              return (
                <div
                  key={entry.walletAddress}
                  className={`flex justify-between items-center px-4 py-3.5 transition-colors ${
                    isSelf ? "bg-[#7C3AED]/10 text-[#A78BFA]" : "hover:bg-[#1A1A24]/20"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-center text-sm font-extrabold font-mono">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                    </span>
                    <span className="text-sm font-semibold font-mono">
                      {truncateAddress(entry.walletAddress)}
                    </span>
                  </div>
                  <div className="flex gap-10 text-sm font-bold font-mono">
                    <span className="w-10 text-center text-gray-300">{entry.wins}</span>
                    <span className="w-16 text-right text-[#F59E0B]">{formatUSDT(entry.totalEarned)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned User's Own Rank at the bottom */}
      {!loading && playerRecord && (
        <div className="mt-4 p-4 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex justify-between items-center shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Your Rank</span>
              <span className="text-base font-extrabold font-mono text-[#A78BFA]">
                #{playerRecord.rank}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Player</span>
              <span className="text-sm font-bold font-mono text-white">
                {truncateAddress(playerRecord.walletAddress)}
              </span>
            </div>
          </div>

          <div className="flex gap-8 text-right font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Wins</span>
              <span className="text-sm font-bold text-gray-300">{playerRecord.wins}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Earned</span>
              <span className="text-sm font-bold text-[#F59E0B]">{formatUSDT(playerRecord.totalEarned)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Leaderboard;
