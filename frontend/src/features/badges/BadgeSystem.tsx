import React from "react";
import { Award, ShieldCheck } from "lucide-react";

export function getBadge(totalCorrect: number): string {
  if (totalCorrect >= 100) return "👑 Nimiq God";
  if (totalCorrect >= 95) return "🌟 Nimiq Visionary";
  if (totalCorrect >= 90) return "🧠 Consensus Guru";
  if (totalCorrect >= 85) return "💎 NIM Master";
  if (totalCorrect >= 80) return "🏆 Nimiq Legend";
  if (totalCorrect >= 75) return "✨ Blockchain Sage";
  if (totalCorrect >= 70) return "🦸 Nimiq Hero";
  if (totalCorrect >= 65) return "🔧 Ecosystem Builder";
  if (totalCorrect >= 60) return "💰 NIM Specialist";
  if (totalCorrect >= 55) return "📚 Nimiq Scholar";
  if (totalCorrect >= 50) return "🗳️ Governance Participant";
  if (totalCorrect >= 45) return "⚡ Albatross Expert";
  if (totalCorrect >= 40) return "🎯 Trivia Master";
  if (totalCorrect >= 35) return "🏦 NIM Collector";
  if (totalCorrect >= 30) return "❤️ Nimiq Enthusiast";
  if (totalCorrect >= 25) return "🎓 Blockchain Student";
  if (totalCorrect >= 20) return "🔒 Staking Apprentice";
  if (totalCorrect >= 15) return "📱 Wallet Learner";
  if (totalCorrect >= 10) return "🔍 NIM Explorer";
  if (totalCorrect >= 5) return "🌱 Nimiq Newbie";
  return "📖 Nimiq Novice";
}

export function getBadgeTier(totalCorrect: number): "Bronze" | "Silver" | "Gold" | "Diamond" {
  if (totalCorrect >= 76) return "Diamond";
  if (totalCorrect >= 51) return "Gold";
  if (totalCorrect >= 26) return "Silver";
  return "Bronze";
}

const STORAGE_KEY = "nimarena_total_correct_answers";

export function getStoredTotalCorrect(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function addCorrectAnswers(count: number): number {
  const current = getStoredTotalCorrect();
  const next = current + count;
  try {
    localStorage.setItem(STORAGE_KEY, next.toString());
  } catch {}
  return next;
}

interface BadgeDisplayProps {
  totalCorrect?: number;
}

export function BadgeDisplay({ totalCorrect }: BadgeDisplayProps) {
  const count = totalCorrect !== undefined ? totalCorrect : getStoredTotalCorrect();
  const badgeTitle = getBadge(count);
  const tier = getBadgeTier(count);

  const tierColors = {
    Bronze: "bg-[#B45309]/20 border-[#B45309]/40 text-[#F59E0B]",
    Silver: "bg-gray-400/20 border-gray-400/40 text-gray-200",
    Gold: "bg-[#EAB308]/20 border-[#EAB308]/40 text-[#FACC15]",
    Diamond: "bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#60A5FA]",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-extrabold ${tierColors[tier]}`}>
      <Award className="w-4 h-4 shrink-0" />
      <span>{badgeTitle}</span>
      <span className="text-[10px] opacity-70">({count} Correct)</span>
    </div>
  );
}

export default BadgeDisplay;
