import React from "react";
import { Zap, Coins, ShieldCheck, Globe } from "lucide-react";

export function NimiqAdvantage() {
  const features = [
    {
      icon: <Zap className="w-5 h-5 text-[#F59E0B]" />,
      title: "1-Second Finality",
      desc: "Instant payout distribution and round resolution with Albatross PoS.",
    },
    {
      icon: <Coins className="w-5 h-5 text-[#10B981]" />,
      title: "Feeless Transactions",
      desc: "Keep 100% of your game winnings with zero network gas friction.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#7C3AED]" />,
      title: "Self-Custodial Security",
      desc: "Direct integration with Nimiq Pay. You control your funds at all times.",
    },
    {
      icon: <Globe className="w-5 h-5 text-[#3B82F6]" />,
      title: "Browser-First Mini App",
      desc: "Zero app store installs. Plays natively inside Nimiq Pay WebViews.",
    },
  ];

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto p-6 rounded-2xl bg-gradient-to-b from-[#13131A] to-[#0A0A0F] border border-[#7C3AED]/30 mb-6 shadow-2xl">
      <div className="text-center mb-6">
        <span className="text-[10px] font-extrabold text-[#7C3AED] uppercase font-mono tracking-widest">
          Powered By Nimiq Ecosystem
        </span>
        <h3 className="text-xl font-extrabold text-white font-display uppercase tracking-wide mt-1">
          Why Nimiq is Built Different
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] flex flex-col gap-2 hover:border-[#7C3AED]/50 transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#13131A] border border-[#2B2B3D]">
                {item.icon}
              </div>
              <h4 className="font-bold text-white text-xs font-display uppercase">
                {item.title}
              </h4>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NimiqAdvantage;
