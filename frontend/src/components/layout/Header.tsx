import React from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { useNIMBalance } from "../../hooks/useNIMBalance";
import { truncateAddress } from "../../lib/formatters";
import { Wallet, Trophy } from "lucide-react";

export function Header() {
  const { walletAddress } = useNimiq();
  const { balance: usdtBalance } = useUSDTBalance();
  const { balance: nimBalance } = useNIMBalance();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-[#13131A]/80 backdrop-blur-md border-b border-[#1F1F2E] shadow-lg">
      {/* Brand logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] shadow-md shadow-[#7C3AED]/30">
          <Trophy className="w-4 h-4 text-white animate-pulse" />
        </div>
        <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-[#F1F1F3] font-display">
          NIM<span className="text-[#7C3AED]">ARENA</span>
        </span>
      </div>

      {/* Wallet info */}
      <div className="flex items-center gap-3">
        {/* NIM Balance */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E0B833]/15 border border-[#E0B833]/30">
          <span className="text-[10px] font-extrabold text-[#E0B833]">NIM</span>
          <span className="text-xs font-bold text-white font-mono">
            {nimBalance}
          </span>
        </div>

        {/* USDT Balance */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30">
          <span className="text-[10px] font-extrabold text-[#10B981]">USDT</span>
          <span className="text-xs font-bold text-white font-mono">
            {usdtBalance}
          </span>
        </div>

        {/* Truncated Address */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA]">
          <Wallet className="w-3.5 h-3.5" />
          <span className="text-xs font-bold font-mono">
            {truncateAddress(walletAddress)}
          </span>
        </div>
      </div>
    </header>
  );
}
export default Header;
