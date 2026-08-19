// Strict Client-Side Dictionary Validator for NimArena
// Validates English words against a 100,000+ word dictionary with O(1) Set lookup.

const dictionarySet = new Set<string>();
let isDictionaryLoaded = false;

// Pre-seed core valid English words for instant synchronous initialization
const INITIAL_CORE_WORDS = [
  "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "ANY", "CAN",
  "HAD", "HER", "WAS", "ONE", "OUR", "OUT", "DAY", "GET", "HAS", "HIM",
  "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "TWO", "WAY", "WHO",
  "BOY", "DID", "ITS", "LET", "PUT", "SAY", "SHE", "TOO", "USE", "DAD",
  "MOM", "CAT", "DOG", "SUN", "RED", "RUN", "WIN", "WAR", "EAR", "EYE",
  "WORD", "GAME", "POT", "DUEL", "NIM", "TEAM", "PLAY", "STAR", "GOLD",
  "NIGHT", "LIGHT", "WATER", "EARTH", "TRAIN", "HOUSE", "WORLD", "POWER",
  "SOLAR", "ARENA", "SMART", "COIN", "PAY", "TOKEN", "BLOCK", "CHAIN",
  "DREAM", "PLANT", "HEART", "MUSIC", "MAGIC", "GREAT", "SUPER", "FLASH",
  "DEV", "DEVELOPER", "CRYPTO", "STAKE", "PRICE", "GUILD", "SCORE", "SPEED",
  "ETE", "ETE" // Note: ETE is not a valid English word and will be rejected
];

// Initialize dictionary set
INITIAL_CORE_WORDS.forEach((w) => {
  const clean = w.trim().toLowerCase();
  if (clean !== "ete") {
    dictionarySet.add(clean);
  }
});

/**
 * Loads full 100,000+ English word dictionary from public/dictionary.txt
 */
export async function loadFullDictionary(): Promise<void> {
  if (isDictionaryLoaded) return;
  try {
    const res = await fetch("/dictionary.txt");
    if (res.ok) {
      const text = await res.text();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const clean = line.trim().toLowerCase();
        if (clean.length >= 3) {
          dictionarySet.add(clean);
        }
      }
      isDictionaryLoaded = true;
      console.log(`WordValidation: Loaded ${dictionarySet.size} English dictionary words.`);
    }
  } catch (e) {
    console.warn("WordValidation: Failed to fetch /dictionary.txt, using initialized dictionary Set.", e);
  }
}

// Auto-trigger full dictionary load
if (typeof window !== "undefined") {
  loadFullDictionary();
}

/**
 * Synchronous strict word validation checking dictionary, length, letter availability & duplicate checks
 */
export function isValidWord(
  word: string,
  availableLetters: string[] | string = [],
  foundWords: string[] = []
): boolean {
  const cleanWord = word.trim().toLowerCase();

  // 1. Check minimum length (3 characters)
  if (cleanWord.length < 3) return false;

  // 2. Strict dictionary Set check (No regex fallback allowed!)
  if (!dictionarySet.has(cleanWord)) return false;

  // 3. Check if word already found (case-insensitive duplicate check)
  const foundSet = new Set(foundWords.map((w) => w.trim().toLowerCase()));
  if (foundSet.has(cleanWord)) return false;

  // 4. Check if word uses only available letters
  if (availableLetters) {
    const letterArr = typeof availableLetters === "string" 
      ? availableLetters.toLowerCase().split("") 
      : availableLetters.map((l) => l.toLowerCase());

    const letterCount: Record<string, number> = {};
    for (const char of letterArr) {
      letterCount[char] = (letterCount[char] || 0) + 1;
    }

    for (const char of cleanWord) {
      if (!letterCount[char] || letterCount[char] <= 0) {
        return false; // Character not available or count exceeded
      }
      letterCount[char]--;
    }
  }

  return true;
}

/**
 * Async dictionary check helper for legacy component calls
 */
export async function validateWord(word: string): Promise<boolean> {
  if (!isDictionaryLoaded) {
    await loadFullDictionary();
  }
  const clean = word.trim().toLowerCase();
  if (clean.length < 3) return false;
  return dictionarySet.has(clean);
}
