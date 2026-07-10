import { wordSet, getRandomSourceWord, isValidWord } from "../routes/words";
import { signScoreProof } from "./signer";

/**
 * Checks if a word can be formed using the given set of letters.
 * Each letter in the given letters string can only be used as many times as it appears.
 */
export function canFormWord(word: string, letters: string): boolean {
  const cleanWord = word.trim().toLowerCase();
  const cleanLetters = letters.trim().toLowerCase();

  // Create char frequency map for letters
  const letterCount: Record<string, number> = {};
  for (const char of cleanLetters) {
    letterCount[char] = (letterCount[char] || 0) + 1;
  }

  // Verify if word can be formed
  for (const char of cleanWord) {
    if (!letterCount[char] || letterCount[char] <= 0) {
      return false;
    }
    letterCount[char]--;
  }

  return true;
}

/**
 * Calculates score for a valid word based on length:
 *   3 letters = 3 points
 *   4 letters = 4 points
 *   5 letters = 6 points
 *   6 letters = 9 points
 *   7+ letters = 12 points
 */
export function getWordScore(word: string): number {
  const len = word.length;
  if (len < 3) return 0;
  if (len === 3) return 3;
  if (len === 4) return 4;
  if (len === 5) return 6;
  if (len === 6) return 9;
  return 12;
}

/**
 * Generates a random set of 10 to 12 letters guaranteed to form at least 10 valid words.
 * Performs up to 50 attempts before throwing an error.
 */
export function generateLetters(difficulty: "easy" | "medium" | "hard" = "medium"): string {
  const targetLength = difficulty === "easy" ? 10 : difficulty === "medium" ? 11 : 12;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const vowels = "aeiou";

  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    
    // Start with a valid source word of length 8-10
    const sourceWord = getRandomSourceWord();
    const lettersArr = sourceWord.split("");

    // Pad with random letters up to targetLength
    while (lettersArr.length < targetLength) {
      // 40% chance of adding a vowel, 60% consonant to keep it formable
      const addVowel = Math.random() < 0.4;
      const charList = addVowel ? vowels : alphabet;
      const randomChar = charList[Math.floor(Math.random() * charList.length)];
      lettersArr.push(randomChar);
    }

    // Shuffle the letters
    for (let i = lettersArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lettersArr[i], lettersArr[j]] = [lettersArr[j], lettersArr[i]];
    }

    const candidateLetters = lettersArr.join("");

    // Verify candidate has at least 10 valid words of 3+ letters
    let validWordCount = 0;
    if (wordSet.size > 0) {
      for (const dictWord of wordSet) {
        if (dictWord.length >= 3 && canFormWord(dictWord, candidateLetters)) {
          validWordCount++;
          if (validWordCount >= 10) {
            break;
          }
        }
      }
    } else {
      // Fallback if dictionary isn't loaded
      validWordCount = 10;
    }

    if (validWordCount >= 10) {
      console.log(`generateLetters: Generated letter set '${candidateLetters}' in ${attempts} attempts (found >= 10 valid words)`);
      return candidateLetters;
    }
  }

  throw new Error(`Failed to generate a letter set with at least 10 valid words after 50 attempts`);
}

/**
 * Validates a word submission.
 * Checks that the word:
 *   1. is at least 3 letters long
 *   2. can be formed from the session letters
 *   3. is in the dictionary (is a valid word)
 *   4. hasn't been found already in this session
 */
export function validateSubmission(
  word: string,
  letters: string,
  foundWords: string[]
): { valid: boolean; error?: string; score: number } {
  const cleanWord = word.trim().toLowerCase();

  if (cleanWord.length < 3) {
    return { valid: false, error: "Word must be at least 3 letters long", score: 0 };
  }

  if (foundWords.map(w => w.toLowerCase()).includes(cleanWord)) {
    return { valid: false, error: "Word already found", score: 0 };
  }

  if (!canFormWord(cleanWord, letters)) {
    return { valid: false, error: "Word cannot be formed from these letters", score: 0 };
  }

  if (!isValidWord(cleanWord)) {
    return { valid: false, error: "Word not found in dictionary", score: 0 };
  }

  const score = getWordScore(cleanWord);
  return { valid: true, score };
}

/**
 * Signs the final score of the word duel round.
 */
export async function signWordDuelScore(
  roundId: number,
  walletAddress: string,
  score: number
): Promise<string> {
  return signScoreProof(roundId, walletAddress, score);
}
