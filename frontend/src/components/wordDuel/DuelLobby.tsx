import React, { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { useNimiq } from "../../hooks/useNimiq";
import { formatUSDT } from "../../lib/formatters";
import { Gamepad2, ArrowRight, Flame, RefreshCw, Users, Key, CalendarDays, Timer, Sparkles } from "lucide-react";

interface OpenDuel {
  id: number;
  player1: string;
  entryFee: string;
  status: string;
  createdAt: string;
}

interface DuelLobbyProps {
  onJoinQueue: (fee: string) => void;
  onCreatePrivate: (fee: string) => void;
  onJoinPrivate: (matchId: number) => void;
  onStartDaily: () => void;
  socketError: string | null;
}

export function DuelLobby({
  onJoinQueue,
  onCreatePrivate,
  onJoinPrivate,
  onStartDaily,
  socketError
}: DuelLobbyProps) {
  const { get } = useApi();
  const { walletAddress } = useNimiq();

  // Tab state: "matchmaker" | "friend" | "daily"
  const [activeTab, setActiveTab] = useState<"matchmaker" | "friend" | "daily">("matchmaker");

  // Matchmaking Tab States
  const [openDuels, setOpenDuels] = useState<OpenDuel[]>([]);
  const [loadingDuels, setLoadingDuels] = useState(false);
  const [selectedFee, setSelectedFee] = useState<string>("0.5");

  // Friend Tab States
  const [friendFee, setFriendFee] = useState<string>("0.5");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");

  // Daily Challenge Tab States
  const [dailyStatusLoading, setDailyStatusLoading] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<{
    played: boolean;
    claimed: boolean;
    nextAvailableAt: string | null;
    lastPlayedAt: string | null;
    rewardAmount: string;
    targetScore: number;
  } | null>(null);

  const [dailyTimeLeftSec, setDailyTimeLeftSec] = useState<number>(0);
  const dailyTimerRef = useRef<any>(null);

  const fetchOpenDuels = async () => {
    setLoadingDuels(true);
    try {
      const data = await get("/api/duels/open");
      setOpenDuels(data || []);
    } catch (err) {
      console.error("DuelLobby: Failed to load open duels:", err);
    } finally {
      setLoadingDuels(false);
    }
  };

  const fetchDailyStatus = async () => {
    if (!walletAddress) return;
    setDailyStatusLoading(true);
    try {
      const data = await get(`/api/daily/status?walletAddress=${walletAddress.toLowerCase()}`);
      setDailyStatus(data);
      
      if (data.played && data.nextAvailableAt) {
        const nextTs = new Date(data.nextAvailableAt).getTime();
        const diff = Math.max(0, Math.floor((nextTs - Date.now()) / 1000));
        setDailyTimeLeftSec(diff);
      }
    } catch (err) {
      console.error("DuelLobby: Failed to fetch daily challenge status:", err);
    } finally {
      setDailyStatusLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "matchmaker") {
      fetchOpenDuels();
      const interval = setInterval(fetchOpenDuels, 15_000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "daily" && walletAddress) {
      fetchDailyStatus();
    }
  }, [activeTab, walletAddress]);

  // 24 hour Countdown Timer
  useEffect(() => {
    if (dailyTimeLeftSec > 0) {
      if (dailyTimerRef.current) clearInterval(dailyTimerRef.current);
      dailyTimerRef.current = setInterval(() => {
        setDailyTimeLeftSec((prev) => {
          if (prev <= 1) {
            clearInterval(dailyTimerRef.current);
            fetchDailyStatus(); // reload status once cooldown completes
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (dailyTimerRef.current) clearInterval(dailyTimerRef.current);
    };
  }, [dailyTimeLeftSec]);

  // Format 24h cooldown timer
  const format24hTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const handleJoinPrivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = parseInt(roomCodeInput.trim(), 10);
    if (!isNaN(code)) {
      onJoinPrivate(code);
    }
  };

  return (
    <div className="pb-24 px-5 max-w-md mx-auto pt-4">
      {/* Title */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-[#7C3AED]" />
          <h2 className="text-xl font-extrabold tracking-wide text-white font-display uppercase">
            Word Duel
          </h2>
        </div>
        
        {activeTab === "matchmaker" && (
          <button
            onClick={fetchOpenDuels}
            style={{ minHeight: "36px", minWidth: "36px" }}
            className="flex items-center justify-center rounded-xl bg-[#1A1A24] border border-[#2B2B3D] text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDuels ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {/* Tabs Header Row */}
      <div className="flex p-1 rounded-xl bg-[#13131A] border border-[#1F1F2E] mb-6">
        <button
          onClick={() => setActiveTab("matchmaker")}
          className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "matchmaker"
              ? "bg-[#7C3AED] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Queue
        </button>
        <button
          onClick={() => setActiveTab("friend")}
          className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "friend"
              ? "bg-[#7C3AED] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Key className="w-3.5 h-3.5" /> Friends
        </button>
        <button
          onClick={() => setActiveTab("daily")}
          className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "daily"
              ? "bg-[#7C3AED] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" /> Daily
        </button>
      </div>

      {/* Error alerts from socket matchmaking */}
      {socketError && (
        <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] font-bold">
          {socketError}
        </div>
      )}

      {/* Tab Contents: MATCHMAKER */}
      {activeTab === "matchmaker" && (
        <>
          {/* Quick Match Creator Panel */}
          <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E] mb-6">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4">
              Quick Match Queue
            </h3>
            
            {/* Fee selection */}
            <div className="flex gap-2.5 mb-5">
              {["0.5", "1.0", "2.0"].map((fee) => (
                <button
                  key={fee}
                  onClick={() => setSelectedFee(fee)}
                  style={{ minHeight: "44px" }}
                  className={`flex-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                    selectedFee === fee
                      ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-[#7C3AED]/25"
                      : "bg-[#1A1A24] text-gray-400 border-[#2B2B3D] hover:border-gray-500"
                  }`}
                >
                  {fee} USDT
                </button>
              ))}
            </div>

            {/* Find opponent button */}
            <button
              onClick={() => onJoinQueue(selectedFee)}
              style={{ minHeight: "48px" }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-extrabold uppercase transition-all duration-200"
            >
              <span>Find Opponent Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Active lobby queue list */}
          <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3">
            Waiting Duels ({openDuels.length})
          </h3>

          <div className="flex flex-col gap-3">
            {loadingDuels && openDuels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
                <div className="w-6 h-6 border-2 border-t-transparent border-[#7C3AED] rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Polling active lobby...</span>
              </div>
            ) : openDuels.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-500 border border-[#1F1F2E] border-dashed rounded-xl bg-[#13131A]/30">
                No open duels. Join the queue to host one!
              </div>
            ) : (
              openDuels.map((duel) => (
                <div
                  key={duel.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#13131A] border border-[#1F1F2E]"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 font-mono tracking-wider">
                      Host: {duel.player1.slice(0, 6)}...{duel.player1.slice(-4)}
                    </span>
                    <span className="text-xs font-bold text-white mt-0.5">
                      Fee: <span className="text-[#F59E0B] font-mono">{formatUSDT(duel.entryFee)} USDT</span>
                    </span>
                  </div>

                  {/* Accept Match */}
                  <button
                    onClick={() => onJoinQueue(formatUSDT(duel.entryFee))}
                    style={{ minHeight: "36px" }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981] hover:text-white text-[10px] font-extrabold uppercase transition-all"
                  >
                    <span>Accept</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tab Contents: PLAY WITH FRIEND */}
      {activeTab === "friend" && (
        <div className="flex flex-col gap-6">
          {/* Create Room Box */}
          <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E]">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">
              Host a Private Room
            </h3>
            <p className="text-[10px] text-gray-500 mb-4">
              Create a custom game room and send the code to your friend to play directly.
            </p>

            {/* Fee selection */}
            <div className="flex gap-2.5 mb-5">
              {["0.5", "1.0", "2.0"].map((fee) => (
                <button
                  key={fee}
                  onClick={() => setFriendFee(fee)}
                  style={{ minHeight: "44px" }}
                  className={`flex-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                    friendFee === fee
                      ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-[#7C3AED]/25"
                      : "bg-[#1A1A24] text-gray-400 border-[#2B2B3D] hover:border-gray-500"
                  }`}
                >
                  {fee} USDT
                </button>
              ))}
            </div>

            {/* Host Private Room Button */}
            <button
              onClick={() => onCreatePrivate(friendFee)}
              style={{ minHeight: "48px" }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#A78BFA] text-white text-xs font-extrabold uppercase transition-all duration-200"
            >
              <span>Create Private Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Join Room Box */}
          <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E]">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">
              Join Private Room
            </h3>
            <p className="text-[10px] text-gray-500 mb-4">
              Enter the numeric room code shared by your friend to join.
            </p>

            <form onSubmit={handleJoinPrivateSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="ROOM CODE..."
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ""))}
                style={{ minHeight: "44px" }}
                className="flex-1 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] px-4 text-sm font-bold text-center text-white focus:outline-none focus:border-[#7C3AED] font-mono tracking-widest"
              />
              <button
                type="submit"
                disabled={!roomCodeInput}
                style={{ minHeight: "44px" }}
                className="px-5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-white text-xs font-extrabold uppercase transition-all disabled:opacity-50 shrink-0"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Contents: DAILY CHALLENGE */}
      {activeTab === "daily" && (
        <div className="p-5 rounded-2xl bg-[#13131A] border border-[#1F1F2E]">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
              Daily Single Player Challenge
            </h3>
          </div>
          
          <p className="text-[10px] text-gray-400 leading-relaxed mb-6">
            Solve the daily anagram! Form valid sub-words from a randomly selected source word and achieve a score of <span className="text-[#7C3AED] font-extrabold">50 points</span> to claim a reward of <span className="text-[#10B981] font-extrabold">1.00 USDT</span> directly on-chain.
          </p>

          {dailyStatusLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-t-transparent border-[#7C3AED] rounded-full animate-spin" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Checking cooldown...</span>
            </div>
          ) : dailyStatus?.played ? (
            // Cooldown layout
            <div className="flex flex-col items-center justify-center p-6 border border-[#2B2B3D] rounded-xl bg-[#1A1A24]/40 text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center">
                <Timer className="w-5 h-5 animate-pulse" />
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Challenge Cooldown
                </span>
                <span className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-normal">
                  You have already played. Next play available in:
                </span>
                <span className="text-base font-extrabold text-[#EF4444] font-mono mt-2 tracking-wider">
                  {format24hTime(dailyTimeLeftSec)}
                </span>
              </div>
            </div>
          ) : (
            // Play details layout
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] text-center">
                  <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
                    Daily Reward
                  </span>
                  <span className="block text-sm font-extrabold text-[#10B981] font-mono mt-0.5">
                    1.00 USDT
                  </span>
                </div>
                
                <div className="p-3.5 rounded-xl bg-[#1A1A24] border border-[#2B2B3D] text-center">
                  <span className="text-[9px] font-extrabold uppercase text-gray-500 tracking-wider">
                    Target Score
                  </span>
                  <span className="block text-sm font-extrabold text-[#F59E0B] font-mono mt-0.5">
                    50 points
                  </span>
                </div>
              </div>

              <button
                onClick={onStartDaily}
                style={{ minHeight: "48px" }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-black text-xs font-extrabold uppercase transition-all duration-200 shadow-md shadow-[#F59E0B]/10"
              >
                <span>Start Daily Challenge</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default DuelLobby;
