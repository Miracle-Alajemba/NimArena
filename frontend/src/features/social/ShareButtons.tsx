import React from "react";
import { Share2 } from "lucide-react";

interface ShareButtonsProps {
  score: number;
  gameName: string;
}

export function ShareButtons({ score, gameName }: ShareButtonsProps) {
  const shareText = `⚔️ I scored ${score} pts in ${gameName} on NimArena! Can you beat my high score on Nimiq Pay? Play now at ${window.location.origin}`;

  const shareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareToFarcaster = () => {
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      <span className="text-[10px] font-extrabold text-gray-400 uppercase font-mono text-center">
        Share Winnings & Challenge Friends
      </span>
      <div className="flex gap-2">
        <button
          onClick={shareToX}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" /> Share on X
        </button>
        <button
          onClick={shareToFarcaster}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#8A63D2] hover:bg-[#7B52C4] text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" /> Farcaster
        </button>
      </div>
    </div>
  );
}

export default ShareButtons;
