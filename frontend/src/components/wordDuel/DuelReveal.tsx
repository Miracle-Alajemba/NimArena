import React, { useState, useEffect } from "react";
import { useContract } from "../../hooks/useContract";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { formatUSDT } from "../../lib/formatters";
import { ShieldCheck, Flame, Trophy, CheckCircle, Award, RefreshCw, XCircle } from "lucide-react";
import { publicClient } from "../../lib/viemClient";
import { CONTRACT_ADDRESS } from "../../config/constants";

interface DuelRevealProps {
  matchId: number;
  chainDuelId: number;
  word: string;
  salt: `0x${string}`;
  entryFee: string;
  opponent: string;
  bothCommitted: boolean;
  duelResult: any; // predicted winner from websocket
  onExit: () => void;
  onShowRipple: () => void;
}

export function DuelReveal({
  matchId,
  chainDuelId,
  word,
  salt,
  entryFee,
  opponent,
  bothCommitted,
  duelResult,
  onExit,
  onShowRipple
}: DuelRevealProps) {
  const { revealWord, finalizeDuel, txLoading, txError } = useContract();
  const { refresh: refreshBalance } = useUSDTBalance();

  const [isRevealed, setIsRevealed] = useState(false);
  const [onChainWord1, setOnChainWord1] = useState("");
  const [onChainWord2, setOnChainWord2] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number>(0); // 0: pending, 1: p1, 2: p2, 3: draw

  // Periodically read duel status from smart contract
  const fetchDuelStatus = async () => {
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" || !chainDuelId) return;

    try {
      const duelData = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: [
          {
            name: "getDuel",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "duelId", type: "uint256" }],
            outputs: [
              { name: "player1", type: "address" },
              { name: "player2", type: "address" },
              { name: "entryFee", type: "uint256" },
              { name: "word1Hash", type: "bytes32" },
              { name: "word2Hash", type: "bytes32" },
              { name: "word1Revealed", type: "string" },
              { name: "word2Revealed", type: "string" },
              { name: "createdAt", type: "uint64" },
              { name: "winner", type: "uint8" },
              { name: "finalized", type: "bool" },
            ],
          },
        ],
        functionName: "getDuel",
        args: [BigInt(chainDuelId)],
      } as any) as any;

      setOnChainWord1(duelData[5]);
      setOnChainWord2(duelData[6]);
      setWinnerIndex(Number(duelData[8]));
      setIsFinalized(duelData[9] as boolean);
    } catch (err) {
      console.warn("DuelReveal: Failed to read duel details from contract:", err);
    }
  };

  useEffect(() => {
    fetchDuelStatus();
    const interval = setInterval(fetchDuelStatus, 5_000);
    return () => clearInterval(interval);
  }, [chainDuelId]);

  const handleReveal = async () => {
    try {
      const hash = await revealWord(chainDuelId, word, salt);
      if (hash) {
        setIsRevealed(true);
        fetchDuelStatus();
      }
    } catch (err) {
      console.error("DuelReveal: Reveal transaction failed:", err);
    }
  };

  const handleFinalize = async () => {
    try {
      const hash = await finalizeDuel(chainDuelId);
      if (hash) {
        setIsFinalized(true);
        onShowRipple(); // Trigger USDT ripple payout animation
        refreshBalance();
        fetchDuelStatus();
      }
    } catch (err) {
      console.error("DuelReveal: Finalize payout failed:", err);
    }
  };

  // Determine winner role
  const isP1Winner = winnerIndex === 1;
  const isP2Winner = winnerIndex === 2;
  const isDraw = winnerIndex === 3;

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4 text-center">
      {/* Title */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] mb-6">
        <Flame className="w-8 h-8 animate-pulse text-[#7C3AED]" />
      </div>

      <h2 className="text-xl font-extrabold text-white tracking-wide font-display uppercase">
        Reveal Phase
      </h2>
      <p className="text-xs text-gray-400 mt-1 mb-8">
        Match ID #{chainDuelId} • Settle Word Lengths
      </p>

      {txError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          {txError}
        </div>
      )}

      {/* Duel word preview boards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Your Board */}
        <div className="p-4 rounded-xl bg-[#13131A] border border-[#1F1F2E] flex flex-col items-center">
          <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
            Your Word
          </span>
          <span className="text-sm font-extrabold text-white uppercase tracking-widest mt-1.5 font-mono">
            {word}
          </span>
          <span className="text-[10px] text-gray-400 font-bold mt-1">
            Length: {word.length}
          </span>
        </div>

        {/* Opponent's Board */}
        <div className="p-4 rounded-xl bg-[#13131A] border border-[#1F1F2E] flex flex-col items-center">
          <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
            Opponent Word
          </span>
          <span className="text-sm font-extrabold text-white uppercase tracking-widest mt-1.5 font-mono">
            {onChainWord2 ? onChainWord2 : (duelResult?.word2 ? duelResult.word2 : "???")}
          </span>
          <span className="text-[10px] text-gray-400 font-bold mt-1">
            Length: {onChainWord2 ? onChainWord2.length : (duelResult?.word2 ? duelResult.word2.length : "???")}
          </span>
        </div>
      </div>

      {/* Reveal Button (if user has not revealed yet) */}
      {!isRevealed && !onChainWord1 ? (
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            You must reveal your word plaintext and secure salt to the smart contract to verify your hash.
          </p>
          <button
            onClick={handleReveal}
            disabled={txLoading}
            style={{ minHeight: "52px" }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-sm font-extrabold uppercase transition-all duration-200"
          >
            {txLoading ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              "Reveal Word to Chain"
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 justify-center py-3.5 text-[#10B981] font-bold text-sm mb-4">
          <CheckCircle className="w-5 h-5" />
          <span>You successfully revealed your word on-chain!</span>
        </div>
      )}

      {/* Finalize Payout (if both revealed but not finalized) */}
      {bothCommitted && onChainWord1 && onChainWord2 && !isFinalized && (
        <div className="p-5 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-left mb-6">
          <h4 className="text-sm font-bold text-white mb-1">Settlement Ready!</h4>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Both words are fully validated and revealed on-chain. Call finalize to distribute the USDT pot.
          </p>
          <button
            onClick={handleFinalize}
            disabled={txLoading}
            style={{ minHeight: "48px" }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-white text-xs font-extrabold uppercase transition-colors"
          >
            {txLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              "Finalize Duel Payout"
            )}
          </button>
        </div>
      )}

      {/* Winner Announcement */}
      {isFinalized && (
        <div className="p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6 flex flex-col items-center">
          {isDraw ? (
            <>
              <XCircle className="w-8 h-8 text-gray-400 mb-2" />
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                Draw Match!
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Words have equal length. Both players refunded!
              </p>
            </>
          ) : (
            <>
              <Award className="w-8 h-8 text-[#F59E0B] mb-2 animate-bounce" />
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                {isP1Winner ? "You Won the Match!" : "Opponent Won!"}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Prize pot of <span className="text-[#10B981] font-bold font-mono">{(parseFloat(entryFee) * 1.9).toFixed(2)} USDT</span> distributed.
              </p>
            </>
          )}
        </div>
      )}

      {/* Exit Button */}
      <button
        onClick={onExit}
        style={{ minHeight: "44px" }}
        className="w-full text-center text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors pt-4"
      >
        Exit Duel Lobby
      </button>
    </div>
  );
}
export default DuelReveal;
