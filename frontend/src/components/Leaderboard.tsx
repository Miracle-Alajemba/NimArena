import React, { useState, useEffect } from "react";
import { Trophy, Medal, User } from "lucide-react";

export interface LeaderboardScore {
  walletAddress: string;
  game: "speed_trivia" | "word_pot" | "word_duel";
  score: number;
  date: string;
}

const STORAGE_KEY = "nimarena_leaderboards";

export function loadLocalLeaderboard(): LeaderboardScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Seed default leaderboard if empty
  const defaultScores: LeaderboardScore[] = [
    { walletAddress: "0x7099...79C8", game: "speed_trivia", score: 1420, date: "2026-08-18" },
    { walletAddress: "0x3C44...3BC", game: "speed_trivia", score: 1250, date: "2026-08-18" },
    { walletAddress: "0x1234...5678", game: "word_pot", score: 380, date: "2026-08-18" },
    { walletAddress: "0x9876...4321", game: "word_duel", score: 410, date: "2026-08-18" },
  ];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultScores));
  } catch {}
  return defaultScores;
}

export function saveLocalScore(scoreItem: LeaderboardScore) {
  try {
    const list = loadLocalLeaderboard();
    list.push(scoreItem);
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.warn("Failed to save score to localStorage", e);
  }
}

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"speed_trivia" | "word_pot" | "word_duel">("speed_trivia");
  const [scores, setScores] = useState<LeaderboardScore[]>([]);

  useEffect(() => {
    setScores(loadLocalLeaderboard());
  }, []);

  const filteredScores = scores
    .filter((s) => s.game === activeTab)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 shadow-xl page-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-[#F59E0B]" />
        <h3 className="text-lg font-extrabold text-white font-display uppercase tracking-wide">
          Arena Leaderboard
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] mb-4">
        {[
          { id: "speed_trivia", label: "Trivia" },
          { id: "word_pot", label: "Word Pot" },
          { id: "word_duel", label: "Word Duel" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-[#7C3AED] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="flex flex-col gap-2">
        {filteredScores.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-mono">
            No scores recorded yet. Be the first to play!
          </div>
        ) : (
          filteredScores.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                    idx === 0
                      ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                      : idx === 1
                      ? "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                      : idx === 2
                      ? "bg-[#B45309]/20 text-[#B45309] border border-[#B45309]/40"
                      : "bg-[#13131A] text-gray-500"
                  }`}
                >
                  #{idx + 1}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-mono font-bold text-gray-200">
                    {item.walletAddress}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold text-[#F59E0B] font-mono">
                  {item.score} pts
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
