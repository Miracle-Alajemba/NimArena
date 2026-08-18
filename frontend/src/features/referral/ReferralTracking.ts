export interface ReferralStats {
  code: string;
  totalReferrals: number;
  earnedUsdt: string;
  earnedNim: string;
}

const REFERRAL_STORAGE_KEY = "nimarena_referrals";

export function generateReferralCode(walletAddress: string | null): string {
  if (!walletAddress) return "NIMARENA";
  const clean = walletAddress.replace("0x", "").toUpperCase();
  return `NIM-${clean.slice(0, 6)}`;
}

export function loadReferralStats(walletAddress: string | null): ReferralStats {
  const code = generateReferralCode(walletAddress);
  try {
    const raw = localStorage.getItem(`${REFERRAL_STORAGE_KEY}_${code}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  const initialStats: ReferralStats = {
    code,
    totalReferrals: 3,
    earnedUsdt: "1.50",
    earnedNim: "15.00",
  };

  try {
    localStorage.setItem(`${REFERRAL_STORAGE_KEY}_${code}`, JSON.stringify(initialStats));
  } catch {}

  return initialStats;
}

export function trackSimulatedReferral(walletAddress: string | null, entryFeeUsdt = 1.0): ReferralStats {
  const stats = loadReferralStats(walletAddress);
  const commission = entryFeeUsdt * 0.1; // 10% commission

  const updated: ReferralStats = {
    ...stats,
    totalReferrals: stats.totalReferrals + 1,
    earnedUsdt: (parseFloat(stats.earnedUsdt) + commission).toFixed(2),
    earnedNim: (parseFloat(stats.earnedNim) + commission * 10).toFixed(2),
  };

  try {
    localStorage.setItem(`${REFERRAL_STORAGE_KEY}_${stats.code}`, JSON.stringify(updated));
  } catch {}

  return updated;
}
