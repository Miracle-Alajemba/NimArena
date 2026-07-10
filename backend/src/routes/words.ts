import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

const router = Router();
export const wordSet = new Set<string>();

// Path to english-words.txt
const dictPath = path.join(__dirname, "../data/english-words.txt");

const sourceWords8to10: string[] = [];

try {
  console.log(`WordsService: Loading dictionary from ${dictPath}...`);
  if (fs.existsSync(dictPath)) {
    const data = fs.readFileSync(dictPath, "utf-8");
    const words = data.split(/\r?\n/);
    let count = 0;
    for (const w of words) {
      const cleanWord = w.trim().toLowerCase();
      if (cleanWord.length > 0) {
        wordSet.add(cleanWord);
        count++;
        // Keep 8-10 letter words for daily challenge source words
        if (cleanWord.length >= 8 && cleanWord.length <= 10 && /^[a-z]+$/.test(cleanWord)) {
          sourceWords8to10.push(cleanWord);
        }
      }
    }
    console.log(`WordsService: Successfully loaded ${count} words. Found ${sourceWords8to10.length} source candidates.`);
  } else {
    console.warn(`WordsService: Dictionary file not found at ${dictPath}. Word validation will allow all words of length >= 3.`);
  }
} catch (error) {
  console.error("WordsService: Failed to read dictionary file:", error);
}

export function getRandomSourceWord(): string {
  if (sourceWords8to10.length > 0) {
    const idx = Math.floor(Math.random() * sourceWords8to10.length);
    return sourceWords8to10[idx];
  }
  return "developer"; // fallback
}

/**
 * Checks if a word is valid.
 * Word must be:
 *   - At least 3 letters long
 *   - Contain only alphabetical characters [a-z]
 *   - Exist in the dictionary (if dictionary loaded)
 */
export function isValidWord(word: string): boolean {
  const cleanWord = word.trim().toLowerCase();
  
  if (cleanWord.length < 3) return false;
  
  // Alpha check
  if (!/^[a-z]+$/.test(cleanWord)) return false;

  // Dictionary check (if dictionary was loaded successfully)
  if (wordSet.size > 0) {
    return wordSet.has(cleanWord);
  }

  // Fallback if dictionary load failed
  return true;
}

// POST /api/words/validate
router.post("/validate", (req: Request, res: Response) => {
  const { word } = req.body;

  if (typeof word !== "string") {
    return res.status(400).json({ error: "Word parameter must be a string" });
  }

  const clean = word.trim();
  const valid = isValidWord(clean);

  return res.json({
    valid,
    length: clean.length
  });
});

export default router;
