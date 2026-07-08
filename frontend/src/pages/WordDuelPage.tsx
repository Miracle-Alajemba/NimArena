import React, { useState } from "react";
import Header from "../components/layout/Header";
import { useDuelSocket } from "../hooks/useDuelSocket";
import { DuelLobby } from "../components/wordDuel/DuelLobby";
import { DuelMatchmaking } from "../components/wordDuel/DuelMatchmaking";
import { DuelCommit } from "../components/wordDuel/DuelCommit";
import { DuelReveal } from "../components/wordDuel/DuelReveal";
import { DailyChallengeGame } from "../components/wordDuel/DailyChallengeGame";
import { Key } from "lucide-react";

interface WordDuelPageProps {
  onShowRipple: () => void;
  onExit: () => void;
}

export function WordDuelPage({ onShowRipple, onExit }: WordDuelPageProps) {
  const {
    gameState,
    matchId,
    opponent,
    role,
    entryFee,
    bothCommitted,
    duelResult,
    socketError,
    joinQueue,
    createPrivateMatch,
    joinPrivateMatch,
    emitCommitted,
    resetDuel,
  } = useDuelSocket();

  // Local state for committed words to survive page refreshes during tx mining
  const [localWord, setLocalWord] = useState<string>("");
  const [localSalt, setLocalSalt] = useState<`0x${string}`>("0x");
  const [chainDuelId, setChainDuelId] = useState<number>(0);

  // Daily challenge toggle state
  const [isDailyActive, setIsDailyActive] = useState<boolean>(false);

  const handleCommitted = (word: string, salt: `0x${string}`, chainId: number) => {
    setLocalWord(word);
    setLocalSalt(salt);
    setChainDuelId(chainId);
    if (matchId) {
      emitCommitted(matchId);
    }
  };

  const handleExit = () => {
    resetDuel();
    onExit();
  };

  const handleDailyComplete = () => {
    setIsDailyActive(false);
    onShowRipple();
  };

  const handleDailyExit = () => {
    setIsDailyActive(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      {/* Header */}
      <Header />

      {/* Daily Challenge Active View */}
      {isDailyActive ? (
        <DailyChallengeGame
          onComplete={handleDailyComplete}
          onExit={handleDailyExit}
          onShowRipple={onShowRipple}
        />
      ) : (
        <>
          {/* Subscreens according to WebSocket matchmaking state */}
          {gameState === "idle" && (
            <DuelLobby
              onJoinQueue={joinQueue}
              onCreatePrivate={createPrivateMatch}
              onJoinPrivate={joinPrivateMatch}
              onStartDaily={() => setIsDailyActive(true)}
              socketError={socketError}
            />
          )}

          {gameState === "searching" && (
            <DuelMatchmaking entryFee={entryFee} onCancel={resetDuel} />
          )}

          {gameState === "private_created" && matchId && (
            <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-16 text-center flex flex-col items-center">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] mb-8">
                <Key className="w-10 h-10 animate-pulse" />
              </div>
              
              <h2 className="text-xl font-extrabold text-white tracking-wide font-display uppercase">
                Private Room Ready
              </h2>
              <p className="text-xs text-gray-400 mt-1 mb-8">
                Staking <span className="text-[#F59E0B] font-bold font-mono">{entryFee} USDT</span> • Share code to play
              </p>

              <div className="w-full p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-8 flex flex-col items-center gap-3">
                <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
                  Room Code
                </span>
                <span className="text-3xl font-extrabold text-[#7C3AED] font-mono tracking-widest bg-[#1A1A24] px-6 py-2.5 rounded-xl border border-[#2B2B3D]">
                  {matchId}
                </span>
                <span className="text-[10px] text-gray-400 font-bold text-center leading-normal">
                  Send this numeric code to your friend. They can enter it under "Join Private Room".
                </span>
              </div>

              <button
                onClick={resetDuel}
                style={{ minHeight: "44px" }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-extrabold uppercase transition-colors"
              >
                Cancel Room Setup
              </button>
            </div>
          )}

          {gameState === "matched" && matchId && opponent && entryFee && role && (
            <DuelCommit
              matchId={matchId}
              opponent={opponent}
              entryFee={entryFee}
              role={role}
              onCommitted={handleCommitted}
            />
          )}

          {(gameState === "committed" ||
            gameState === "revealed" ||
            gameState === "result_ready") &&
            entryFee &&
            opponent && (
              <DuelReveal
                matchId={matchId || 0}
                chainDuelId={chainDuelId || matchId || 0}
                word={localWord}
                salt={localSalt}
                entryFee={entryFee}
                opponent={opponent}
                bothCommitted={bothCommitted}
                duelResult={duelResult}
                onExit={handleExit}
                onShowRipple={onShowRipple}
              />
            )}
        </>
      )}
    </div>
  );
}
export default WordDuelPage;
