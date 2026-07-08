import React from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { useNIMBalance } from "../../hooks/useNIMBalance";
import { truncateAddress } from "../../lib/formatters";
import { Wallet, Gamepad2 } from "lucide-react";

export function Header() {
  const { walletAddress } = useNimiq();
  const { balance: usdtBalance } = useUSDTBalance();
  const { balance: nimBalance } = useNIMBalance();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-[#13131A]/80 backdrop-blur-md border-b border-[#1F1F2E] shadow-lg">
      {/* Brand logo / Gaming Arena Hub Logo */}
      <div className="flex items-center gap-2.5 select-none">
        {/* Arena Shield Emblem */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#13131A] border-2 border-[#7C3AED]/80 shadow-[0_0_15px_rgba(124,58,237,0.3)] overflow-hidden">
          {/* Neon background grid/lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F1F2E_1px,transparent_1px),linear-gradient(to_bottom,#1F1F2E_1px,transparent_1px)] bg-[size:5px_5px] opacity-45" />
          
          {/* Swirling arena energy rings */}
          <div className="absolute inset-0 border border-t-[#A78BFA] border-r-transparent border-b-[#7C3AED] border-l-transparent rounded-full animate-spin duration-3000 opacity-60" />
          
          {/* Game Hub Icon */}
          <Gamepad2 className="w-5 h-5 text-white z-10 drop-shadow-[0_0_4px_rgba(124,58,237,0.8)]" />
          
          {/* Orbiting Game Pips (representing multiple games living inside) */}
          <span className="absolute top-1 left-1 w-1 h-1 rounded-full bg-[#10B981]" />
          <span className="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-[#EF4444]" />
        </div>

        {/* Text Logo with metallic & neon gaming gradient */}
        <div className="flex flex-col">
          <span className="text-sm font-extrabold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-white via-[#F3F4F6] to-gray-400 font-display uppercase leading-none">
            NIM<span className="text-[#A78BFA]">ARENA</span>
          </span>
          <span className="text-[8px] font-bold text-gray-500 tracking-[0.3em] uppercase mt-1 leading-none">
            GAME HUB
          </span>
        </div>
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
