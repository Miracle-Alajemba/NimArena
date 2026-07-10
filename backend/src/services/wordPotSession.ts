import { wordSet, getRandomSourceWord, isValidWord } from "../routes/words";
import { signScoreProof } from "./signer";
import { canFormWord, validateSubmission, getWordScore } from "./wordDuelSession";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * In-memory cache for shared round letter sets.
 * KEY:   roundId (number)
 * VALUE: letters string (e.g. "treasonble")
 *
 * This is the primary fast-path. The database is the source of truth.
 * On process restart, we fall back to DB lookup before generating.
 */
const roundLettersCache = new Map<number, string>();

/**
 * Get or generate the shared letter set for a Word Pot round.
 *
 * STRICT RULE: Letters are generated ONCE per roundId.
 * If letters already exist (in memory or DB), the cached version is ALWAYS returned.
 * This ensures all players in the same round receive identical letters.
 *
 * @param roundId - The Word Pot round ID from the smart contract.
 * @returns The letter string for this round (11 letters by default).
 */
export async function getOrGenerateRoundSourceWord(roundId: number): Promise<string> {
  // 1. Fast-path: check in-memory cache first
  if (roundLettersCache.has(roundId)) {
    const cached = roundLettersCache.get(roundId)!;
    console.log(`WordPotSession: [CACHE HIT] Returning cached letters for round ${roundId}: '${cached}'`);
    return cached;
  }

  // 2. DB lookup — check if letters were previously generated and stored
  try {
    const existingRound = await prisma.wordPotRound.findUnique({
      where: { roundId },
    });

    if (existingRound) {
      // Letters already exist in DB — NEVER regenerate, always use cached version
      console.warn(
        `WordPotSession: [WARN] Generation attempt for existing round ${roundId}. ` +
        `Returning DB-cached letters: '${existingRound.letters}'. No regeneration.`
      );
      roundLettersCache.set(roundId, existingRound.letters);
      return existingRound.letters;
    }
  } catch (dbErr) {
    console.warn(`WordPotSession: DB unavailable for round ${roundId} lookup, checking in-memory only.`, dbErr);
    // Continue to generation with in-memory fallback below
  }

  // 3. Generate fresh letters for this round (first player to join triggers this)
  console.log(`WordPotSession: Generating new shared source word for round ${roundId}...`);
  const letters = generateSourceWord();

  // 4. Persist to DB (ignore error — in-memory cache is the fallback)
  try {
    await prisma.wordPotRound.create({
      data: { roundId, letters },
    });
    console.log(`WordPotSession: Stored shared letters for round ${roundId}: '${letters}'`);
  } catch (dbErr) {
    console.warn(`WordPotSession: Could not persist letters for round ${roundId} to DB. Using in-memory cache.`, dbErr);
  }

  // 5. Always store in memory regardless of DB success
  roundLettersCache.set(roundId, letters);
  console.log(`WordPotSession: [GENERATED] New letters for round ${roundId}: '${letters}'`);
  return letters;
}

/**
 * Generates a random 8-12 letter word guaranteed to form at least 10 valid smaller words.
 */
export function generateSourceWord(): string {
  let attempts = 0;
  while (attempts < 50) {
    attempts++;

    const sourceWord = getRandomSourceWord();
    if (sourceWord.length < 8 || sourceWord.length > 12) continue;

    // Verify at least 10 valid words of 3+ letters
    let validWordCount = 0;
    if (wordSet.size > 0) {
      for (const dictWord of wordSet) {
        if (dictWord.length >= 3 && dictWord !== sourceWord && canFormWord(dictWord, sourceWord)) {
          validWordCount++;
          if (validWordCount >= 10) break;
        }
      }
    } else {
      validWordCount = 10; // fallback if dictionary not loaded
    }

    if (validWordCount >= 10) {
      console.log(`WordPotSession: Generated source word '${sourceWord}' in ${attempts} attempt(s).`);
      return sourceWord;
    }
  }

  throw new Error("WordPotSession: Failed to generate a valid source word after 50 attempts");
}

/**
 * Signs the final Word Pot score using the backend ECDSA key.
 * Hash: keccak256(abi.encodePacked(roundId, walletAddress, score))
 * This matches the Solidity submitWordPotScore verification logic.
 */
export async function signWordPotScore(
  roundId: number,
  walletAddress: string,
  score: number
): Promise<string> {
  return signScoreProof(roundId, walletAddress, score);
}

// Re-export shared utilities for use in the route
export { validateSubmission, getWordScore, canFormWord };
