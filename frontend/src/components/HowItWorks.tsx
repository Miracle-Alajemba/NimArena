import React from "react";
import { ShieldCheck, Trophy, Clock, Coins, Sparkles } from "lucide-react";

export function HowItWorks() {
  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#7C3AED]" />
        <h3 className="text-lg font-extrabold text-white font-display uppercase tracking-wide">
          How NimArena Works
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 text-xs text-gray-300">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D]">
          <Coins className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white font-display uppercase">Entry Fee & Wagers</div>
            <div className="text-gray-400 mt-0.5">
              Stake 1 USDT or 5 NIM to enter live arena rounds. Practice modes are 100% free with no wallet needed.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D]">
          <Trophy className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white font-display uppercase">Prize Split (95% Winner)</div>
            <div className="text-gray-400 mt-0.5">
              The top scorer takes 95% of the total pool balance! A 5% platform fee keeps the arena running. In tournament pots, top 3 players split 50% / 30% / 20%.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D]">
          <Clock className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white font-display uppercase">Time Limits & Scoring</div>
            <div className="text-gray-400 mt-0.5">
              60 seconds per word battle; 10 seconds per trivia question. Accuracy + speed bonuses yield higher scores.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D]">
          <ShieldCheck className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white font-display uppercase">Anti-Cheat & Verification</div>
            <div className="text-gray-400 mt-0.5">
              Every device fingerprint & proof is signed by the Nimiq Mini App SDK to guarantee fair skill competition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default HowItWorks;
