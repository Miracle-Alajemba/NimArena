import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "../../hooks/useApi";
import { useContract } from "../../hooks/useContract";
import { useNimiq } from "../../hooks/useNimiq";
import { generateSalt, hashWord } from "../../lib/wordHash";
import { truncateAddress } from "../../lib/formatters";
import { Check, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
import { publicClient } from "../../lib/viemClient";
import { CONTRACT_ADDRESS } from "../../config/constants";
import { parseAbiItem } from "viem";

interface DuelCommitProps {
  matchId: number;
  opponent: string;
  entryFee: string;
  role: "player1" | "player2";
  onCommitted: (word: string, salt: `0x${string}`, chainDuelId: number) => void;
}

const duelCreatedAbi = parseAbiItem("event DuelCreated(uint256 indexed duelId, address indexed player1, uint256 entryFee)");

export function DuelCommit({ matchId, opponent, entryFee, role, onCommitted }: DuelCommitProps) {
  const { post } = useApi();
  const { createDuel, joinDuel, txLoading, txError } = useContract();
  const { walletAddress } = useNimiq();

  const [word, setWord] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [wordValid, setWordValid] = useState(false);
  const [wordLength, setWordLength] = useState(0);
  
  const [isTxConfirmed, setIsTxConfirmed] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  // Live word check on input change (with debounced-like effect via useEffect)
  useEffect(() => {
    const cleanWord = word.trim();
    if (cleanWord.length < 3) {
      setWordValid(false);
      setWordLength(cleanWord.length);
      return;
    }

    setIsValidating(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await post("/api/words/validate", { word: cleanWord });
        setWordValid(res.valid);
        setWordLength(res.length);
      } catch (err) {
        console.error("DuelCommit: Word validation failed:", err);
      } finally {
        setIsValidating(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [word, post]);

  const handleLockIn = async () => {
    if (!wordValid || txLoading || !walletAddress) return;

    setLoadingMsg("Generating secure keys...");
    const salt = generateSalt();
    const hash = hashWord(word, salt);

    // Store word and salt in sessionStorage for reveal phase
    sessionStorage.setItem(`duel_word_${matchId}`, word);
    sessionStorage.setItem(`duel_salt_${matchId}`, salt);

    try {
      let chainDuelId = matchId;
      if (role === "player1") {
        setLoadingMsg("Confirming USDT stake in wallet...");
        const hashResult = await createDuel(entryFee, hash);
        if (!hashResult) throw new Error("Transaction rejected or failed");
        
        setLoadingMsg("Awaiting block confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash: hashResult });
        
        // Find duelId from events
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: duelCreatedAbi,
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber
        });
        if (logs.length > 0 && logs[0].args.duelId) {
          chainDuelId = Number(logs[0].args.duelId);
        }
      } else {
        setLoadingMsg("Joining duel and locking stake...");
        // Player 2 needs to join using the on-chain duelId. 
        // We'll query if player 1 has created it or default to matchId if aligned
        const hashResult = await joinDuel(matchId, entryFee, hash);
        if (!hashResult) throw new Error("Transaction rejected or failed");
        setLoadingMsg("Confirming on chain...");
      }

      setIsTxConfirmed(true);
      onCommitted(word, salt, chainDuelId);
    } catch (err) {
      console.error("DuelCommit: Contract transaction failed:", err);
      setLoadingMsg("");
    }
  };

  return (
    <div className="pb-24 px-5 max-w-md mx-auto pt-4">
      {/* Duel header info */}
      <div className="flex justify-between items-center p-4 rounded-xl bg-[#13131A] border border-[#1F1F2E] mb-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
            Opponent
          </span>
          <span className="text-xs font-bold text-white font-mono mt-0.5">
            {truncateAddress(opponent)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
            Match Stake
          </span>
          <span className="text-sm font-extrabold text-[#F59E0B] font-mono block">
            {entryFee} USDT
          </span>
        </div>
      </div>

      {txError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          {txError}
        </div>
      )}

      {/* Lock Input Card */}
      {!isTxConfirmed ? (
        <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] flex flex-col gap-4">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" /> Lock in Word
          </h3>
          
          <p className="text-xs text-gray-400 leading-relaxed">
            Choose a valid English word. Longer words beat shorter words.
          </p>

          {/* Word Input */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z]/g, ""))}
                disabled={txLoading}
                placeholder="TYPE WORD"
                style={{ minHeight: "52px" }}
                className="w-full px-5 py-3 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] text-white text-base font-bold tracking-widest placeholder:tracking-normal placeholder:font-semibold uppercase text-center focus:outline-none focus:border-[#7C3AED] transition-colors disabled:opacity-50"
              />
              
              {/* Validation Spinner/Check */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {isValidating ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-[#7C3AED] rounded-full animate-spin" />
                ) : word.trim().length >= 3 && (
                  wordValid ? (
                    <Check className="w-5 h-5 text-[#10B981]" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-[#EF4444]" />
                  )
                )}
              </div>
            </div>

            {/* Validation Info Footer */}
            {word.trim().length > 0 && (
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-gray-500 uppercase">Length: <span className="text-white font-mono">{wordLength}</span></span>
                {word.trim().length >= 3 && (
                  wordValid ? (
                    <span className="text-[#10B981] uppercase">Valid English Word</span>
                  ) : (
                    <span className="text-[#EF4444] uppercase">Not in dictionary</span>
                  )
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleLockIn}
            disabled={!wordValid || txLoading}
            style={{ minHeight: "52px" }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-sm font-extrabold uppercase transition-all duration-200 disabled:opacity-40"
          >
            {txLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                <span className="text-xs uppercase font-bold tracking-wide">{loadingMsg}</span>
              </div>
            ) : (
              "Confirm & Lock Word"
            )}
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#13131A] border border-[#1F1F2E] flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Waiting for Opponent
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
            Your word hash has been verified and registered on-chain. Waiting for your opponent to submit their transaction.
          </p>
        </div>
      )}
    </div>
  );
}
export default DuelCommit;
