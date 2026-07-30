import React from "react";
import { useNimiq } from "../../hooks/useNimiq";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { useNIMBalance } from "../../hooks/useNIMBalance";
import { truncateAddress } from "../../lib/formatters";
import { Wallet, Gamepad2 } from "lucide-react";

interface HeaderProps {
  onBack?: () => void;
}

export function Header({ onBack }: HeaderProps) {
  const { walletAddress } = useNimiq();
  const { balance: usdtBalance } = useUSDTBalance();
  const { balance: nimBalance } = useNIMBalance();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-[#13131A]/90 backdrop-blur-xl border-b border-[#7C3AED]/15 shadow-[0_2px_20px_rgba(0,0,0,0.4)]">
      {/* Brand logo */}
      <div
        className={`flex items-center gap-2.5 select-none ${onBack ? "cursor-pointer" : ""}`}
        onClick={onBack}
      >
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#13131A] border border-[#F59E0B]/50 shadow-[0_0_12px_rgba(245,158,11,0.25)] overflow-hidden">
          <img src="/logo.png" alt="NimArena Logo" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col">
          <span
            className="text-sm font-extrabold tracking-[0.15em] uppercase leading-none"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: "linear-gradient(90deg, #fff 30%, #A78BFA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
            }}
          >
            NIM<span style={{ color: "#A78BFA", WebkitTextFillColor: "#A78BFA" }}>ARENA</span>
          </span>
          <span className="text-[8px] font-bold text-gray-500 tracking-[0.3em] uppercase mt-0.5 leading-none">
            GAME HUB
          </span>
        </div>
      </div>

      {/* Wallet pills */}
      <div className="flex items-center gap-2">
        {/* NIM Balance */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4F6EF7]/15 border border-[#4F6EF7]/35">
          <span className="text-[9px] font-extrabold text-[#4F6EF7] tracking-wider">NIM</span>
          <span className="text-[11px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {nimBalance}
          </span>
        </div>

        {/* USDT Balance */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/35">
          <span className="text-[9px] font-extrabold text-[#10B981] tracking-wider">USDT</span>
          <span className="text-[11px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {usdtBalance}
          </span>
        </div>

        {/* Wallet address */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/25 text-[#A78BFA]">
          <Wallet className="w-3 h-3" />
          <span className="text-[10px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {truncateAddress(walletAddress)}
          </span>
        </div>
      </div>
    </header>
  );
}
export default Header;
