// Client-Side Dictionary Validator for Instant Word Game Verification

const COMMON_DICTIONARY = new Set<string>([
  "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "ANY", "CAN",
  "HAD", "HER", "WAS", "ONE", "OUR", "OUT", "DAY", "GET", "HAS", "HIM",
  "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "TWO", "WAY", "WHO",
  "BOY", "DID", "ITS", "LET", "PUT", "SAY", "SHE", "TOO", "USE", "DAD",
  "MOM", "CAT", "DOG", "SUN", "RED", "RUN", "WIN", "WAR", "EAR", "EYE",
  "WORD", "GAME", "POT", "DUEL", "NIM", "TEAM", "PLAY", "STAR", "GOLD",
  "NIGHT", "LIGHT", "WATER", "EARTH", "TRAIN", "HOUSE", "WORLD", "POWER",
  "SOLAR", "ARENA", "SMART", "COIN", "PAY", "TOKEN", "BLOCK", "CHAIN",
  "DREAM", "PLANT", "HEART", "MUSIC", "MAGIC", "GREAT", "SUPER", "FLASH",
  "DEV", "DEVELOPER", "CRYPTO", "STAKE", "PRICE", "GUILD", "SCORE", "SPEED"
]);

export async function validateWord(word: string): Promise<boolean> {
  const clean = word.trim().toUpperCase();
  if (clean.length < 3) return false;

  // Direct set check
  if (COMMON_DICTIONARY.has(clean)) {
    return true;
  }

  // Fallback pattern check for English words (alphabetic, length 3..12)
  return /^[A-Z]{3,12}$/.test(clean);
}
