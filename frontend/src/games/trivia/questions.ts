import { NIMIQ_QUESTIONS, NimiqTriviaQuestion } from "./nimiqQuestions";

export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIdx: number;
  category: string;
  difficulty?: "easy" | "medium" | "hard";
}

// Session used questions tracker to prevent duplicate questions
const usedQuestionTexts = new Set<string>();

export async function fetchTriviaQuestions(amount = 10): Promise<TriviaQuestion[]> {
  const resultQuestions: TriviaQuestion[] = [];

  // Filter out questions used in current session
  let unusedCandidates = NIMIQ_QUESTIONS.filter((q) => !usedQuestionTexts.has(q.question));

  // If candidate pool exhausted, reset tracker
  if (unusedCandidates.length < amount) {
    usedQuestionTexts.clear();
    unusedCandidates = [...NIMIQ_QUESTIONS];
  }

  // Shuffle candidate pool
  const shuffled = [...unusedCandidates].sort(() => Math.random() - 0.5);

  for (const item of shuffled) {
    usedQuestionTexts.add(item.question);

    resultQuestions.push({
      id: resultQuestions.length + 1,
      question: item.question,
      options: item.options,
      correctIdx: item.correctIdx,
      category: item.category,
      difficulty: item.difficulty,
    });

    if (resultQuestions.length >= amount) break;
  }

  return resultQuestions;
}

export function resetUsedTriviaQuestions(): void {
  usedQuestionTexts.clear();
}
