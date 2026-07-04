import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "../config/constants";
import { useNimiq } from "./useNimiq";

export type MatchmakingState = "idle" | "searching" | "private_created" | "matched" | "committed" | "revealed" | "result_ready";

export interface DuelResult {
  matchId: number;
  winner: "player1" | "player2" | "draw";
  word1: string;
  word2: string;
  word1Valid: boolean;
  word2Valid: boolean;
}

export function useDuelSocket() {
  const { walletAddress } = useNimiq();
  const socketRef = useRef<Socket | null>(null);
  
  const [gameState, setGameState] = useState<MatchmakingState>("idle");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [role, setRole] = useState<"player1" | "player2" | null>(null);
  const [entryFee, setEntryFee] = useState<string | null>(null);
  const [bothCommitted, setBothCommitted] = useState<boolean>(false);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    console.log("SocketClient: Connecting to:", BACKEND_URL);
    const socket = io(BACKEND_URL, {
      autoConnect: true,
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("SocketClient: Connected successfully.");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("SocketClient: Disconnected.");
      setIsConnected(false);
      setGameState("idle");
    });

    // Listen for private match creation
    socket.on("duel:private_created", (data: { matchId: number; entryFee: string }) => {
      console.log("SocketClient: Private match created. Match ID:", data.matchId);
      setMatchId(data.matchId);
      setEntryFee(data.entryFee);
      setGameState("private_created");
      setSocketError(null);
    });

    // Listen for match matchings
    socket.on("duel:matched", (data: { matchId: number; opponent: string; entryFee: string; role: "player1" | "player2" }) => {
      console.log("SocketClient: Matched with opponent:", data.opponent, "Match ID:", data.matchId);
      setMatchId(data.matchId);
      setOpponent(data.opponent);
      setRole(data.role);
      setEntryFee(data.entryFee);
      setGameState("matched");
      setSocketError(null);
    });

    // Listen for both committed
    socket.on("duel:both_committed", (data: { matchId: number }) => {
      console.log("SocketClient: Both players committed for Match ID:", data.matchId);
      setBothCommitted(true);
      setGameState("committed");
    });

    // Listen for duel results
    socket.on("duel:result", (data: DuelResult) => {
      console.log("SocketClient: Duel result received:", data);
      setDuelResult(data);
      setGameState("result_ready");
    });

    // Listen for errors
    socket.on("duel:error", (data: { message: string }) => {
      console.warn("SocketClient: Error event:", data.message);
      setSocketError(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join matchmaking queue
  const joinQueue = useCallback((fee: string) => {
    if (!socketRef.current || !walletAddress) return;
    
    // Reset state
    setMatchId(null);
    setOpponent(null);
    setRole(null);
    setEntryFee(fee);
    setBothCommitted(false);
    setDuelResult(null);
    setSocketError(null);

    setGameState("searching");
    socketRef.current.emit("duel:join_queue", {
      entryFee: fee,
      walletAddress: walletAddress.toLowerCase(),
    });
  }, [walletAddress]);

  // Create private match
  const createPrivateMatch = useCallback((fee: string) => {
    if (!socketRef.current || !walletAddress) return;

    setMatchId(null);
    setOpponent(null);
    setRole(null);
    setEntryFee(fee);
    setBothCommitted(false);
    setDuelResult(null);
    setSocketError(null);

    setGameState("searching");
    socketRef.current.emit("duel:create_private", {
      entryFee: fee,
      walletAddress: walletAddress.toLowerCase(),
    });
  }, [walletAddress]);

  // Join private match with code
  const joinPrivateMatch = useCallback((mId: number) => {
    if (!socketRef.current || !walletAddress) return;

    setMatchId(mId);
    setOpponent(null);
    setRole(null);
    setEntryFee(null);
    setBothCommitted(false);
    setDuelResult(null);
    setSocketError(null);

    setGameState("searching");
    socketRef.current.emit("duel:join_private", {
      matchId: mId,
      walletAddress: walletAddress.toLowerCase(),
    });
  }, [walletAddress]);

  // Lock in (emit committed)
  const emitCommitted = useCallback((mId: number) => {
    if (!socketRef.current || !walletAddress) return;
    socketRef.current.emit("duel:committed", {
      matchId: mId,
      walletAddress: walletAddress.toLowerCase(),
    });
  }, [walletAddress]);

  // Reveal plaintext word
  const emitRevealed = useCallback((mId: number, word: string) => {
    if (!socketRef.current || !walletAddress) return;
    setGameState("revealed");
    socketRef.current.emit("duel:revealed", {
      matchId: mId,
      walletAddress: walletAddress.toLowerCase(),
      word,
    });
  }, [walletAddress]);

  // Exit match or reset state to idle
  const resetDuel = useCallback(() => {
    setGameState("idle");
    setMatchId(null);
    setOpponent(null);
    setRole(null);
    setEntryFee(null);
    setBothCommitted(false);
    setDuelResult(null);
    setSocketError(null);
  }, []);

  return {
    isConnected,
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
    emitRevealed,
    resetDuel,
  };
}
