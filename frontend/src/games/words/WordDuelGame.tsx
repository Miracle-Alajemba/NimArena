import React, { useState, useEffect } from "react";
import { generateLetterSet, calculateWordScore, isSubsetOfLetters } from "./WordEngine";
import { validateWord } from "./WordValidation";
import { WordUI } from "./WordUI";

interface WordDuelGameProps {
  roundId?: number;
  entryFee?: string;
  onComplete: (score: number, foundWords: string[]) => void;
  onExit: () => void;
}

export function WordDuelGame({ onComplete, onExit }: WordDuelGameProps) {
  const [letters, setLetters] = useState<string>("");
  const [currentInput, setCurrentInput] = useState<string>("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize 7 scrambled letters
  useEffect(() => {
    setLetters(generateLetterSet(7));
  }, []);

  // 60 second timer
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      onComplete(score, foundWords);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds, score, foundWords, onComplete]);

  const handleSubmitWord = async () => {
    setErrorMsg(null);
    const cleanWord = currentInput.trim().toUpperCase();

    if (cleanWord.length < 3) {
      setErrorMsg("Word must be at least 3 letters long.");
      return;
    }

    if (foundWords.includes(cleanWord)) {
      setErrorMsg("Word already submitted!");
      return;
    }

    if (!isSubsetOfLetters(cleanWord, letters)) {
      setErrorMsg("Invalid letters used.");
      return;
    }

    const isValid = await validateWord(cleanWord);
    if (!isValid) {
      setErrorMsg("Not found in dictionary.");
      return;
    }

    const gained = calculateWordScore(cleanWord);
    setFoundWords((prev) => [...prev, cleanWord]);
    setScore((prev) => prev + gained);
    setCurrentInput("");
  };

  return (
    <WordUI
      title="WORD DUEL ARENA"
      subtitle="TIMED ANAGRAM SPEED BATTLE • 60S TIMER"
      letters={letters}
      currentInput={currentInput}
      onInputChange={setCurrentInput}
      onSubmitWord={handleSubmitWord}
      foundWords={foundWords}
      score={score}
      timeLeftSeconds={timeLeftSeconds}
      maxTimeSeconds={60}
      errorMsg={errorMsg}
      onExit={onExit}
    />
  );
}

export default WordDuelGame;
