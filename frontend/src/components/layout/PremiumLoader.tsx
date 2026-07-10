import React from "react";

interface PremiumLoaderProps {
  text?: string;
}

export function PremiumLoader({ text = "Loading arena..." }: PremiumLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 page-fade-in">
      {/* Three dot pulse */}
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full bg-[#7C3AED] dot-pulse-1" />
        <div className="w-3 h-3 rounded-full bg-[#A78BFA] dot-pulse-2" />
        <div className="w-3 h-3 rounded-full bg-[#7C3AED] dot-pulse-3" />
      </div>
      <p
        className="text-xs font-bold uppercase tracking-widest text-gray-500"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {text}
      </p>
    </div>
  );
}
export default PremiumLoader;
