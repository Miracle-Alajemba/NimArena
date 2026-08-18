// Speed Trivia Scoring Engine
// Score = 100 points per correct answer + (remaining seconds * speed bonus multiplier)

export interface QuestionScoreResult {
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  totalPoints: number;
}

export function calculateQuestionScore(
  isCorrect: boolean,
  timeLeftSeconds: number, // 0..10 seconds remaining
  maxTimeSeconds = 10
): QuestionScoreResult {
  if (!isCorrect) {
    return { isCorrect: false, basePoints: 0, speedBonus: 0, totalPoints: 0 };
  }

  const basePoints = 100;
  // Speed bonus: up to 50 additional points based on remaining time fraction
  const timeFraction = Math.max(0, Math.min(1, timeLeftSeconds / maxTimeSeconds));
  const speedBonus = Math.round(timeFraction * 50);
  const totalPoints = basePoints + speedBonus;

  return { isCorrect: true, basePoints, speedBonus, totalPoints };
}

export function calculateFinalTriviaScore(
  results: QuestionScoreResult[],
  streakBonusCount = 0
): { score: number; totalCorrect: number; maxScore: number } {
  let score = 0;
  let totalCorrect = 0;

  for (const r of results) {
    if (r.isCorrect) {
      score += r.totalPoints;
      totalCorrect += 1;
    }
  }

  // Extra streak bonus for answering multiple questions correctly in a row
  if (streakBonusCount >= 5) {
    score += 150;
  }

  const maxScore = results.length * 150; // 150 max per question
  return { score, totalCorrect, maxScore };
}
