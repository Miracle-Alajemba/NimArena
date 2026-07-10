import { useState, useEffect, useCallback } from "react";
import { formatToken } from "../lib/formatters";
import { publicClient } from "../lib/viemClient";
import { USDT_ADDRESS } from "../config/constants";
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

export function useUSDTBalance() {
  const { walletAddress } = useNimiq();
  const [balance, setBalance] = useState<string>("0.00");
  const [rawBalance, setRawBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress || !USDT_ADDRESS || USDT_ADDRESS === "0x6e2c3479B48Cc54C5fC60F8119C6E015e3c7cfc0") {
      // Return 0 if not loaded or if using default placeholder before contract deployed
      return;
    }

    try {
      setLoading(true);
      const bal = await publicClient.readContract({
        address: USDT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      } as any) as bigint;

      setRawBalance(bal);
      const formatted = formatToken(bal, 6);
      setBalance(formatted);
    } catch (error) {
      console.error("BalanceService: Failed to fetch USDT balance:", error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
      // Poll every 10 seconds
      const interval = setInterval(fetchBalance, 10_000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, fetchBalance]);

  return { balance, rawBalance, loading, refresh: fetchBalance };
}
