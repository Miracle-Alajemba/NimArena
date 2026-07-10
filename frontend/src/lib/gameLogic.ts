export function wordEmoji(len: number) {
  if (len <= 4) return "👍";
  if (len <= 6) return "🔥";
  return "🏆";
}

export function scoreForLength(len: number) {
  if (len === 3) return 3;
  if (len === 4) return 4;
  if (len === 5) return 6;
  if (len === 6) return 9;
  return 12;
}
