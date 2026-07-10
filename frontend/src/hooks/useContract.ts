import { useState, useCallback } from "react";
import { parseUnits } from "viem";
import { publicClient, walletClient, targetChain } from "../lib/viemClient";
import { CONTRACT_ADDRESS, USDT_ADDRESS, NIM_ADDRESS } from "../config/constants";
import { useNimiq } from "./useNimiq";
import { NIM_ARENA_ABI } from "../config/abi";

// ERC-20 interface slice for check & approve
const erc20Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "remaining", type: "uint256" }],
  },
] as const;

export function useContract() {
  const { walletAddress } = useNimiq();
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Check and approve token allowance if needed
  const ensureAllowance = useCallback(
    async (tokenAddress: `0x${string}`, amountRaw: bigint): Promise<boolean> => {
      if (!walletAddress || !walletClient) {
        throw new Error("Wallet not connected");
      }

      setTxLoading(true);
      setTxError(null);

      const symbol = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase() ? "NIM" : "USDT";

      try {
        // 1. Check current allowance
        console.log(`ContractService: Checking allowance of ${symbol} for ${CONTRACT_ADDRESS}...`);
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [walletAddress, CONTRACT_ADDRESS],
        } as any) as bigint;

        console.log(`ContractService: Current allowance: ${allowance.toString()} Needed: ${amountRaw.toString()}`);

        if (allowance >= amountRaw) {
          setTxLoading(false);
          return true;
        }

        // 2. Request approve transaction
        console.log(`ContractService: Approving ${amountRaw.toString()} ${symbol}...`);
        const maxVal = ethersMaxApproveValue(tokenAddress, amountRaw);

        const hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, maxVal],
          account: walletAddress,
          chain: targetChain,
        } as any);

        console.log(`ContractService: ${symbol} Approval tx sent. Hash:`, hash);

        // Wait for tx confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`ContractService: ${symbol} Approval confirmed. Receipt:`, receipt.status);

        setTxLoading(false);
        return receipt.status === "success";
      } catch (err: any) {
        console.error(`ContractService: ${symbol} Approval failed:`, err);
        setTxError(err.message || `${symbol} Approval failed`);
        setTxLoading(false);
        return false;
      }
    },
    [walletAddress]
  );

  // General write wrapper
  const writeContractMethod = useCallback(
    async (
      functionName: string,
      args: any[],
      tokenAddress?: `0x${string}`,
      valueRawNeeded = 0n
    ): Promise<`0x${string}` | null> => {
      if (!walletAddress || !walletClient) {
        throw new Error("Wallet not connected");
      }

      setTxLoading(true);
      setTxError(null);

      try {
        // Ensure approval if the action requires staking tokens
        if (tokenAddress && valueRawNeeded > 0n) {
          const approved = await ensureAllowance(tokenAddress, valueRawNeeded);
          if (!approved) {
            const sym = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase() ? "NIM" : "USDT";
            throw new Error(`Insufficient ${sym} allowance approved.`);
          }
          // Reset loading state set by ensureAllowance
          setTxLoading(true);
        }

        console.log(`ContractService: Invoking ${functionName}...`);
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: NIM_ARENA_ABI,
          functionName: functionName as any,
          args: args as any,
          account: walletAddress,
          chain: targetChain,
        } as any);

        console.log(`ContractService: Tx sent successfully. Hash:`, hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`ContractService: Tx confirmed. Receipt:`, receipt.status);

        if (receipt.status !== "success") {
          throw new Error("Transaction execution reverted on-chain.");
        }

        setTxLoading(false);
        return hash;
      } catch (err: any) {
        console.error(`ContractService: Method ${functionName} failed:`, err);
        setTxError(err.message || `Transaction ${functionName} failed`);
        setTxLoading(false);
        return null;
      }
    },
    [walletAddress, ensureAllowance]
  );

  // Word Duel Rounds writes
  const createWordDuelRound = useCallback(
    async (entryFee: string, durationSeconds: number, tokenAddress: `0x${string}`) => {
      const decimals = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase() ? 18 : 6;
      const feeRaw = parseUnits(entryFee, decimals);
      return writeContractMethod("createWordDuelRound", [tokenAddress, feeRaw, BigInt(durationSeconds)], tokenAddress, feeRaw);
    },
    [writeContractMethod]
  );

  const enterWordDuel = useCallback(
    async (roundId: number, entryFee: string, tokenAddress: `0x${string}`) => {
      const decimals = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase() ? 18 : 6;
      const feeRaw = parseUnits(entryFee, decimals);
      return writeContractMethod("enterWordDuel", [BigInt(roundId)], tokenAddress, feeRaw);
    },
    [writeContractMethod]
  );

  const submitWordDuelScore = useCallback(
    async (roundId: number, score: number, backendProof: `0x${string}`) => {
      return writeContractMethod("submitWordDuelScore", [BigInt(roundId), BigInt(score), backendProof]);
    },
    [writeContractMethod]
  );

  const finalizeWordDuel = useCallback(
    async (roundId: number) => {
      return writeContractMethod("finalizeWordDuel", [BigInt(roundId)]);
    },
    [writeContractMethod]
  );

  const finalizeTrivia = useCallback(
    async (roundId: number) => {
      return writeContractMethod("finalizeTrivia", [BigInt(roundId)]);
    },
    [writeContractMethod]
  );

  // Speed Trivia writes
  const createTriviaRound = useCallback(
    async (entryFee: string, durationSeconds: number, tokenAddress: `0x${string}`) => {
      const decimals = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase() ? 18 : 6;
      const feeRaw = parseUnits(entryFee, decimals);
      return writeContractMethod("createTriviaRound", [tokenAddress, feeRaw, BigInt(durationSeconds)], tokenAddress, feeRaw);
    },
    [writeContractMethod]
  );

  const enterTrivia = useCallback(
    async (roundId: number, entryFee: string, tokenAddress: `0x${string}`) => {
      const decimals = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase() ? 18 : 6;
      const feeRaw = parseUnits(entryFee, decimals);
      return writeContractMethod("enterTrivia", [BigInt(roundId)], tokenAddress, feeRaw);
    },
    [writeContractMethod]
  );

  const submitTriviaScore = useCallback(
    async (roundId: number, score: number, backendProof: `0x${string}`) => {
      return writeContractMethod("submitTriviaScore", [BigInt(roundId), BigInt(score), backendProof]);
    },
    [writeContractMethod]
  );

  return {
    txLoading,
    txError,
    createWordDuelRound,
    enterWordDuel,
    submitWordDuelScore,
    finalizeWordDuel,
    createTriviaRound,
    enterTrivia,
    submitTriviaScore,
    finalizeTrivia,
  };
}

// helper to approve max values
function ethersMaxApproveValue(tokenAddress: `0x${string}`, needed: bigint): bigint {
  const isNim = tokenAddress.toLowerCase() === NIM_ADDRESS.toLowerCase();
  if (isNim) {
    const tenMillionNim = 10000000n * (10n ** 18n);
    return needed > tenMillionNim ? needed : tenMillionNim;
  } else {
    const oneMillionUsdt = 1000000n * (10n ** 6n);
    return needed > oneMillionUsdt ? needed : oneMillionUsdt;
  }
}
