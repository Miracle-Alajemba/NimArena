import React from "react";
import { ArrowRight, Lock } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  status: "live" | "coming_soon";
  details?: string;
  prize?: string;
  players?: string;
  onClick?: () => void;
  emoji?: string;
  accentColor?: string;
}

export function GameCard({
  title,
  description,
  status,
  details,
  prize,
  players,
  onClick,
  emoji = "🎮",
  accentColor = "#7C3AED",
}: GameCardProps) {
  const isLive = status === "live";

  return (
    <div
      onClick={isLive ? onClick : undefined}
      className={`relative flex flex-col p-5 rounded-2xl bg-[#13131A] border transition-all duration-200 overflow-hidden ${
        isLive
          ? "cursor-pointer border-[#7C3AED]/20 hover:border-[#7C3AED]/60 hover:shadow-[0_0_30px_rgba(124,58,237,0.18)] active:scale-[0.97] hover:scale-[1.02]"
          : "opacity-40 cursor-not-allowed border-[#1F1F2E]"
      }`}
      style={{ minHeight: "175px" }}
    >
      {/* Gradient overlay on hover */}
      {isLive && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 70%)` }}
        />
      )}

      {/* Top row: emoji + badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl leading-none select-none">{emoji}</div>
        <div>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] live-dot" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800/60 text-gray-500 border border-gray-700/50">
              🔒 COMING SOON
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-extrabold text-white mb-1.5 tracking-tight"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed flex-1">{description}</p>

      {/* Bottom meta */}
      {isLive && (
        <div className="flex items-center justify-between mt-4 border-t border-[#1F1F2E]/80 pt-3">
          <div className="flex items-center gap-3 text-[10px] font-bold font-mono">
            {prize && (
              <span className="text-[#F59E0B]">💰 {prize}</span>
            )}
            {players && (
              <span className="text-gray-400">👥 {players}</span>
            )}
            {!prize && !players && details && (
              <span className="text-gray-500 uppercase tracking-wider">{details}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[#A78BFA] text-[10px] font-bold uppercase tracking-wider">
            Play <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      )}
    </div>
  );
}
export default GameCard;
