import React from "react";
import Header from "../components/layout/Header";
import Leaderboard from "../components/leaderboard/Leaderboard";

export function LeaderboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      {/* Header */}
      <Header />

      {/* Rankings */}
      <Leaderboard />
    </div>
  );
}
export default LeaderboardPage;
