import React from "react";
import { ArrowRight, Lock } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  status: "live" | "coming_soon";
  details?: string;
  onClick?: () => void;
  accentColor?: string;
  icon?: React.ReactNode;
}

export function GameCard({
  title,
  description,
  status,
  details,
  onClick,
  accentColor = "#7C3AED",
  icon,
}: GameCardProps) {
  const isLive = status === "live";

  return (
    <div
      onClick={isLive ? onClick : undefined}
      style={{ minHeight: "150px" }}
      className={`relative flex flex-col justify-between p-5 rounded-2xl glass-card transition-all duration-300 ${
        isLive
          ? "cursor-pointer border-l-4 border-l-[#7C3AED] hover:border-l-[#A78BFA] hover:shadow-lg hover:shadow-[#7C3AED]/10 active:scale-98"
          : "opacity-40 cursor-not-allowed"
      }`}
    >
      {/* Upper header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          {/* Status badge */}
          <div>
            {isLive ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gray-700/30 text-gray-400 border border-gray-600/30">
                <Lock className="w-2.5 h-2.5" /> COMING SOON
              </span>
            )}
          </div>
          {/* Title */}
          <h3 className="text-lg font-extrabold text-[#F1F1F3] tracking-wide mt-1">
            {title}
          </h3>
        </div>

        {/* Custom icon */}
        <div className="p-2.5 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] text-[#A78BFA]">
          {icon}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 font-body leading-relaxed mt-2.5">
        {description}
      </p>

      {/* Details/Metadata at the bottom */}
      <div className="flex items-center justify-between border-t border-[#1F1F2E] pt-3.5 mt-4">
        <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
          {details || "Skill Game"}
        </span>

        {isLive && (
          <div className="flex items-center gap-1 text-[#7C3AED] hover:text-[#A78BFA] transition-colors">
            <span className="text-[11px] font-extrabold tracking-wide uppercase">Play</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}
export default GameCard;
