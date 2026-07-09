import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useContract } from "../../hooks/useContract";
import { useNimiq } from "../../hooks/useNimiq";
import { useUSDTBalance } from "../../hooks/useUSDTBalance";
import { formatToken } from "../../lib/formatters";
import { NIM_ADDRESS } from "../../config/constants";
import { Plus, Users, Clock, Trophy, Play, CheckCircle } from "lucide-react";
import { publicClient } from "../../lib/viemClient";
import { CONTRACT_ADDRESS, USDT_ADDRESS } from "../../config/constants";

interface TriviaRound {
  roundId: number;
  creator: string;
  entryFee: string;
  startTime: number;
  endTime: number;
  topScorer: string;
  topScore: number;
  poolBalance: string;
  playerCount: number;
  finalized: boolean;
}

interface TriviaLobbyProps {
  onStartTrivia: (roundId: number, entryFee: string) => void;
}

export function TriviaLobby({ onStartTrivia, onStartPractice }: TriviaLobbyProps) {
  const { get } = useApi();
  const { enterTrivia, createTriviaRound, txLoading, txError } = useContract();
  const { walletAddress } = useNimiq();
  const { refresh: refreshBalance } = useUSDTBalance();

  const [rounds, setRounds] = useState<TriviaRound[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Round Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feeOption, setFeeOption] = useState<string>("0.5");
  const [duration, setDuration] = useState<number>(300); // 5 mins default

  const [selectedCurrency, setSelectedCurrency] = useState<"USDT" | "NIM">("USDT");
  const tokenAddress = selectedCurrency === "USDT" ? USDT_ADDRESS : NIM_ADDRESS;
  const tokenDecimals = selectedCurrency === "USDT" ? 6 : 18;
  const feeOptions = selectedCurrency === "USDT" ? ["0.5", "1.0", "2.0"] : ["50", "100", "200"];

  useEffect(() => {
    setFeeOption(selectedCurrency === "USDT" ? "0.5" : "50");
  }, [selectedCurrency]);


  // Track entered rounds
  const [enteredRounds, setEnteredRounds] = useState<Record<number, boolean>>({});

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const data = await get("/api/trivia/rounds");
      setRounds(data || []);

      // Check entered status for each round on-chain
      if (walletAddress && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
        const enteredStates: Record<number, boolean> = {};
        for (const r of data) {
          try {
            const entered = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: [
                {
                  name: "triviaEntered",
                  type: "function",
                  stateMutability: "view",
                  inputs: [
                    { name: "", type: "uint256" },
                    { name: "", type: "address" },
                  ],
                  outputs: [{ name: "", type: "bool" }],
                },
              ],
              functionName: "triviaEntered",
              args: [BigInt(r.roundId), walletAddress],
            } as any);
            enteredStates[r.roundId] = entered as boolean;
          } catch (e) {
            console.error("TriviaLobby: Failed to check entered status:", e);
          }
        }
        setEnteredRounds(enteredStates);
      }
    } catch (err) {
      console.error("TriviaLobby: Failed to fetch rounds:", err);
      // Mock rounds fallback for preview
      setRounds([
        {
          roundId: 1,
          creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          entryFee: "1000000", // 1 USDT
          startTime: Math.floor(Date.now() / 1000) - 100,
          endTime: Math.floor(Date.now() / 1000) + 1200,
          topScorer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          topScore: 1250,
          poolBalance: "5000000", // 5 USDT
          playerCount: 5,
          finalized: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
    const interval = setInterval(fetchRounds, 15_000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleEnterRound = async (roundId: number, fee: string, tokenAddress: `0x${string}`) => {
    try {
      const hash = await enterTrivia(roundId, fee, tokenAddress);
      if (hash) {
        setEnteredRounds((prev) => ({ ...prev, [roundId]: true }));
        refreshBalance();
        fetchRounds();
      }
    } catch (error) {
      console.error("TriviaLobby: Enter round failed:", error);
    }
  };

  const handleCreateRound = async () => {
    try {
      const hash = await createTriviaRound(feeOption, duration, tokenAddress);
      if (hash) {
        setShowCreateModal(false);
        refreshBalance();
        fetchRounds();
      }
    } catch (error) {
      console.error("TriviaLobby: Create round failed:", error);
    }
  };

  return (
    <div className="pb-24 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#F59E0B]" />
          <h2 className="text-xl font-extrabold tracking-wide text-white font-display uppercase">
            Speed Trivia
          </h2>
        </div>

        {/* Create round button */}
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ minHeight: "44px" }}
          className="flex items-center gap-1 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-bold uppercase transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {/* Practice Mode */}
      <div
        onClick={onStartPractice}
        className="w-full relative overflow-hidden rounded-2xl bg-[#0A0A0F] border-2 border-[#10B981]/50 cursor-pointer group hover:border-[#10B981] transition-all mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
      >
        <div className="absolute top-0 right-0 px-3 py-1 bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold rounded-bl-lg font-mono">
          FREE — No Wallet Needed
        </div>

        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/30">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-white text-lg tracking-wide group-hover:text-[#10B981] transition-colors">
                PRACTICE ARENA
              </h3>
              <p className="text-[#10B981]/80 text-xs font-mono">Warm up your trivia skills</p>
            </div>
          </div>
          <div className="text-[#10B981]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </div>
        </div>
      </div>

      {/* Currency selection */}
      <div className="flex gap-2 mb-6 p-1 rounded-xl bg-[#1A1A24] border border-[#2B2B3D]">
        <button
          onClick={() => setSelectedCurrency("USDT")}
          className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${selectedCurrency === "USDT" ? "bg-[#10B981] text-white" : "text-gray-400 hover:text-white"
            }`}
        >
          USDT
        </button>
        <button
          onClick={() => setSelectedCurrency("NIM")}
          className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${selectedCurrency === "NIM" ? "bg-[#7C3AED] text-white" : "text-gray-400 hover:text-white"
            }`}
        >
          NIM
        </button>
      </div>

      {/* Error alerts */}
      {txError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          {txError}
        </div>
      )}

      {/* Rounds list */}
      <div className="flex flex-col gap-4">
        {loading && rounds.filter((r: any) => !r.tokenAddress || r.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading active rounds...</span>
          </div>
        ) : rounds.filter((r: any) => !r.tokenAddress || r.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3 border border-[#1F1F2E] rounded-2xl bg-[#13131A]">
            <Trophy className="w-8 h-8 opacity-25" />
            <span className="text-xs font-bold uppercase tracking-wider text-center px-4">
              No active trivia rounds.<br />Create one to start playing!
            </span>
          </div>
        ) : (
          rounds.filter((r: any) => !r.tokenAddress || r.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()).map((round: any) => {
            const hasEntered = enteredRounds[round.roundId] || false;
            const timeLeftSec = Math.max(0, round.endTime - Math.floor(Date.now() / 1000));
            const formattedTime = timeLeftSec > 0
              ? `${Math.floor(timeLeftSec / 60)}m ${timeLeftSec % 60}s`
              : "Ended";

            return (
              <div
                key={round.roundId}
                className="flex flex-col p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] relative overflow-hidden"
              >
                {/* Upper row */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-500 font-mono tracking-wider">
                      Round #{round.roundId}
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-0.5">
                      Entry Fee: <span className="text-[#F59E0B] font-mono">{formatToken(round.entryFee, tokenDecimals)} {selectedCurrency}</span>
                    </h3>
                  </div>

                  {/* Total Pool */}
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
                      Total prize pool
                    </span>
                    <div className="text-base font-extrabold text-[#10B981] font-mono">
                      {formatToken(round.poolBalance, tokenDecimals)} {selectedCurrency}
                    </div>
                  </div>
                </div>

                {/* Info row */}
                <div className="flex gap-4 items-center mt-2 text-xs text-gray-400 border-t border-[#1F1F2E]/60 pt-3 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span className="font-mono">{round.playerCount} players</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span className="font-mono">{formattedTime}</span>
                  </div>
                </div>

                {timeLeftSec === 0 ? (
                  <button
                    onClick={async () => {
                      if (txLoading) return;
                      await finalizeTrivia(round.roundId);
                      fetchRounds();
                    }}
                    disabled={txLoading}
                    style={{ minHeight: "44px" }}
                    className="w-full rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold uppercase transition-colors"
                  >
                    {txLoading ? "Finalizing..." : "End Round & Distribute Pot"}
                  </button>
                ) : hasEntered ? (
                  <button
                    onClick={() => onStartTrivia(round.roundId, round.entryFee)}
                    style={{ minHeight: "44px" }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-white text-xs font-bold uppercase transition-colors"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Trivia Round
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnterRound(round.roundId, round.entryFee, tokenAddress)}
                    disabled={txLoading}
                    style={{ minHeight: "44px" }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    {txLoading ? (
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    ) : (
                      "Join & Stake Fee"
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Round Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#13131A] border border-[#2B2B3D] p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-extrabold text-white font-display uppercase tracking-wide">
              Create Trivia Round
            </h3>

            {/* Fee Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                Entry Fee ({selectedCurrency})
              </label>
              <div className="flex gap-2">
                {feeOptions.map((fee) => (
                  <button
                    key={fee}
                    onClick={() => setFeeOption(fee)}
                    style={{ minHeight: "40px" }}
                    className={`flex-1 rounded-xl text-xs font-bold font-mono transition-all border ${feeOption === fee
                        ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                        : "bg-[#1A1A24] text-gray-300 border-[#2B2B3D]"
                      }`}
                  >
                    {fee} {selectedCurrency}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selector */}
            <div className="flex flex-col gap-2 mt-1">
              <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                Round Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "5 Min", value: 300 },
                  { label: "15 Min", value: 900 },
                  { label: "1 Hour", value: 3600 },
                  { label: "1 Day", value: 86400 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    style={{ minHeight: "40px" }}
                    className={`rounded-xl text-xs font-bold transition-all border ${duration === opt.value
                        ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                        : "bg-[#1A1A24] text-gray-300 border-[#2B2B3D]"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-[#1F1F2E] pt-4 mt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ minHeight: "44px" }}
                className="flex-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRound}
                disabled={txLoading}
                style={{ minHeight: "44px" }}
                className="flex-1 flex items-center justify-center rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-bold uppercase transition-colors disabled:opacity-50"
              >
                {txLoading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                ) : (
                  "Create Round"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TriviaLobby;
