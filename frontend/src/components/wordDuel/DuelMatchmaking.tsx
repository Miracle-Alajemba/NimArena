import React from "react";
import { Loader2, Gamepad2, X } from "lucide-react";

interface DuelMatchmakingProps {
  entryFee: string | null;
  onCancel: () => void;
}

export function DuelMatchmaking({ entryFee, onCancel }: DuelMatchmakingProps) {
  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-16 text-center">
      {/* Pulsing Gamepad Icon */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] mb-8">
        <Gamepad2 className="w-10 h-10 animate-pulse" />
        {/* Ring animations */}
        <div className="absolute inset-0 rounded-full border-2 border-[#7C3AED] opacity-20 scale-110 animate-ping duration-1000" />
      </div>

      <h2 className="text-xl font-extrabold text-white tracking-wide font-display uppercase">
        Searching Opponent
      </h2>
      <p className="text-xs text-gray-400 mt-1 mb-8">
        Staking <span className="text-[#F59E0B] font-bold font-mono">{entryFee} USDT</span> • Matchmaking in progress
      </p>

      {/* Matchmaking status indicators */}
      <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-8 max-w-xs mx-auto flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Waiting in lobby queue...
        </span>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{ minHeight: "44px" }}
        className="inline-flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-extrabold uppercase transition-colors"
      >
        <X className="w-4 h-4" /> Cancel Matchmaking
      </button>
    </div>
  );
}
export default DuelMatchmaking;
