import React, { useState } from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { loadReferralStats } from "./ReferralTracking";
import { Share2, Copy, Check, Users, Gift } from "lucide-react";

export function ReferralSystem() {
  const { walletAddress } = useNimiq();
  const [stats, setStats] = useState(() => loadReferralStats(walletAddress));
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/?ref=${stats.code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto p-6 rounded-2xl bg-[#13131A] border border-[#7C3AED]/30 mb-6 shadow-xl page-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-5 h-5 text-[#7C3AED]" />
        <h3 className="text-lg font-extrabold text-white font-display uppercase tracking-wide">
          Referral & Marketing Rewards
        </h3>
      </div>

      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Invite friends to play in NimArena! You earn <span className="text-[#10B981] font-bold">10% of their entry fees</span> directly in your wallet balance.
      </p>

      {/* Referral Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex items-center gap-3">
          <Users className="w-5 h-5 text-[#3B82F6]" />
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-mono">Friends Joined</div>
            <div className="text-base font-extrabold text-white font-mono">{stats.totalReferrals}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex items-center gap-3">
          <Gift className="w-5 h-5 text-[#F59E0B]" />
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-mono">10% Earned</div>
            <div className="text-base font-extrabold text-[#10B981] font-mono">${stats.earnedUsdt} USDT</div>
          </div>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-extrabold text-gray-400 uppercase font-mono">Your Unique Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-3 py-2.5 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] text-xs text-gray-300 font-mono select-all focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-bold uppercase transition-all flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReferralSystem;
