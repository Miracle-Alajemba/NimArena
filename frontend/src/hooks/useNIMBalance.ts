import { useState, useEffect, useCallback } from "react";
import { formatUnits } from "viem";
import { publicClient } from "../lib/viemClient";
import { NIM_ADDRESS } from "../config/constants";
import { useNimiq } from "./useNimiq";

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

export function useNIMBalance() {
  const { walletAddress } = useNimiq();
  const [balance, setBalance] = useState<string>("0.00");
  const [rawBalance, setRawBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress || !NIM_ADDRESS || NIM_ADDRESS === "0xC44CdDdB6a900fa2b585dd299e03d12FA4293BC") {
      return;
    }

    try {
      setLoading(true);
      const bal = await publicClient.readContract({
        address: NIM_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      } as any) as bigint;

      setRawBalance(bal);
      // Wrapped NIM (WNIM) uses 18 decimals
      const formatted = Number(formatUnits(bal, 18)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setBalance(formatted);
    } catch (error) {
      console.error("BalanceService: Failed to fetch NIM balance:", error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 10_000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, fetchBalance]);

  return { balance, rawBalance, loading, refresh: fetchBalance };
}
