// Shared Word Engine: Letter Generation & Scoring

const VOWELS = ["A", "E", "I", "O", "U"];
const CONSONANTS = [
  "B", "C", "D", "F", "G", "H", "J", "K", "L", "M",
  "N", "P", "Q", "R", "S", "T", "V", "W", "X", "Y", "Z"
];

const RARE_LETTERS = new Set(["J", "K", "Q", "X", "Z"]);

export function generateLetterSet(count = 7): string {
  // Ensure balanced vowel & consonant distribution (e.g., 2-3 vowels, 4-5 consonants)
  const numVowels = Math.floor(Math.random() * 2) + 2; // 2 or 3 vowels
  const numConsonants = count - numVowels;

  const result: string[] = [];

  for (let i = 0; i < numVowels; i++) {
    result.push(VOWELS[Math.floor(Math.random() * VOWELS.length)]);
  }

  for (let i = 0; i < numConsonants; i++) {
    result.push(CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]);
  }

  // Shuffle array
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

export function calculateWordScore(word: string): number {
  const upper = word.toUpperCase().trim();
  if (upper.length < 3) return 0;

  // Base score = word length * 10
  let baseScore = upper.length * 10;

  // Extra bonus for rare letters (J, K, Q, X, Z)
  let rareBonus = 0;
  for (const char of upper) {
    if (RARE_LETTERS.has(char)) {
      rareBonus += 15;
    }
  }

  return baseScore + rareBonus;
}

export function isSubsetOfLetters(word: string, availableLetters: string): boolean {
  const wordChars = word.toUpperCase().split("");
  const availableCount: Record<string, number> = {};

  for (const char of availableLetters.toUpperCase()) {
    availableCount[char] = (availableCount[char] || 0) + 1;
  }

  for (const char of wordChars) {
    if (!availableCount[char] || availableCount[char] <= 0) {
      return false;
    }
    availableCount[char]--;
  }

  return true;
}
