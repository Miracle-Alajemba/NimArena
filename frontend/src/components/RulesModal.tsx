import React from "react";
import { X, HelpCircle } from "lucide-react";

interface RulesModalProps {
  gameType: "trivia" | "word_pot" | "word_duel";
  onClose: () => void;
}

export function RulesModal({ gameType, onClose }: RulesModalProps) {
  const titles = {
    trivia: "Speed Trivia Rules",
    word_pot: "Word Pot Rules",
    word_duel: "Word Duel Rules",
  };

  const details = {
    trivia: [
      "10 multiple choice questions per round.",
      "10 seconds per question timer.",
      "100 points for correct answer + speed bonus up to 50 pts.",
      "Streak bonus (+150 pts) for 5+ correct answers in a row.",
      "Highest total score takes the pot."
    ],
    word_pot: [
      "All players share the exact same 7 letter tiles.",
      "60 seconds total round timer.",
      "Form valid English words of 3+ letters.",
      "Words with rare letters (J, K, Q, X, Z) grant +15 bonus points each.",
      "Highest total cumulative score wins the round!"
    ],
    word_duel: [
      "Get a 7 letter scrambled anagram set.",
      "60 seconds to form as many valid words as possible.",
      "Score = word length x 10 + rare letter bonuses.",
      "Beat your opponent's score before time runs out!"
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm page-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-[#13131A] border border-[#2B2B3D] p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-[#7C3AED]" />
          <h3 className="text-lg font-extrabold text-white font-display uppercase tracking-wide">
            {titles[gameType]}
          </h3>
        </div>

        <ul className="flex flex-col gap-2.5 mb-6 text-xs text-gray-300">
          {details[gameType].map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[#10B981] font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-bold uppercase transition-all"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
}
export default RulesModal;
