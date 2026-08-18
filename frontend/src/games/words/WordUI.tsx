import React from "react";

interface WordUIProps {
  title: string;
  subtitle: string;
  letters: string;
  currentInput: string;
  onInputChange: (val: string) => void;
  onSubmitWord: () => void;
  foundWords: string[];
  score: number;
  timeLeftSeconds: number;
  maxTimeSeconds?: number;
  errorMsg?: string | null;
  onExit: () => void;
}

export function WordUI({
  title,
  subtitle,
  letters,
  currentInput,
  onInputChange,
  onSubmitWord,
  foundWords,
  score,
  timeLeftSeconds,
  maxTimeSeconds = 60,
  errorMsg,
  onExit,
}: WordUIProps) {
  const progressPercent = (timeLeftSeconds / maxTimeSeconds) * 100;
  const letterArray = letters.toUpperCase().split("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmitWord();
    }
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4 px-4 pb-24 page-fade-in">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-display uppercase tracking-wide">
            {title}
          </h2>
          <p className="text-xs text-[#10B981] font-mono">{subtitle}</p>
        </div>

        {/* Score & Exit */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Score</div>
            <div className="text-xl font-extrabold text-[#F59E0B] font-mono">{score}</div>
          </div>
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg bg-[#1F1F2E] hover:bg-[#2B2B3D] text-gray-400 text-xs font-bold transition-all"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-2 rounded-full overflow-hidden bg-[#1A1A24] mb-6">
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full transition-all duration-300 rounded-full ${
            timeLeftSeconds < 10 ? "bg-[#EF4444]" : timeLeftSeconds < 25 ? "bg-[#F59E0B]" : "bg-[#10B981]"
          }`}
        />
      </div>

      {/* Letter Tiles Grid */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {letterArray.map((ch, idx) => (
          <div
            key={idx}
            className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl bg-gradient-to-b from-[#1E1E2E] to-[#13131A] border-2 border-[#7C3AED]/50 shadow-[0_4px_12px_rgba(124,58,237,0.2)] flex items-center justify-center text-xl font-extrabold text-white font-mono select-none"
          >
            {ch}
          </div>
        ))}
      </div>

      {/* Input Box & Submit */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => onInputChange(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="TYPE WORD HERE..."
          className="flex-1 px-4 py-3 rounded-xl bg-[#13131A] border border-[#2B2B3D] focus:border-[#7C3AED] focus:outline-none text-white text-center text-lg font-mono font-extrabold tracking-wider"
          autoFocus
        />
        <button
          onClick={onSubmitWord}
          className="px-6 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-bold uppercase transition-all duration-200"
        >
          Submit
        </button>
      </div>

      {/* Error message toast */}
      {errorMsg && (
        <div className="p-2.5 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold text-center">
          {errorMsg}
        </div>
      )}

      {/* Found Words Grid */}
      <div className="p-4 rounded-2xl bg-[#13131A] border border-[#1F1F2E]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-extrabold text-gray-400 font-mono uppercase">
            Found Words ({foundWords.length})
          </span>
        </div>

        {foundWords.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4 font-mono">
            Form words of 3+ letters from the tiles above!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {foundWords.map((w, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-lg bg-[#1F1F2E] border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-extrabold"
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
