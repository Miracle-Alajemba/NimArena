import re

with open('frontend/src/hooks/useContract.ts', 'r') as f:
    content = f.read()

# Update finalizeDuel
old_func = """  const finalizeDuel = useCallback(async (duelId: number) => {
    try {
      setTxLoading(true);
      setTxError(null);
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: NIM_ARENA_ABI,
        functionName: "finalizeDuel",
        args: [BigInt(duelId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      setTxError(err.shortMessage || err.message || "Failed to finalize duel");
      return null;
    } finally {
      setTxLoading(false);
    }
  }, []);"""

new_func = """  const finalizeDuel = useCallback(async (duelId: number, winnerIndex: number, signature: string) => {
    try {
      setTxLoading(true);
      setTxError(null);
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: NIM_ARENA_ABI,
        functionName: "finalizeDuel",
        args: [BigInt(duelId), winnerIndex, signature],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      setTxError(err.shortMessage || err.message || "Failed to finalize duel");
      return null;
    } finally {
      setTxLoading(false);
    }
  }, []);"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Success: useContract finalizeDuel replaced")
else:
    print("Error: useContract finalizeDuel not found")
    
# Add finalizeTrivia to useContract
if "functionName: \"finalizeTrivia\"" not in content:
    finalize_trivia = """
  const finalizeTrivia = useCallback(async (roundId: number) => {
    try {
      setTxLoading(true);
      setTxError(null);
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: NIM_ARENA_ABI,
        functionName: "finalizeTrivia",
        args: [BigInt(roundId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      setTxError(err.shortMessage || err.message || "Failed to finalize trivia");
      return null;
    } finally {
      setTxLoading(false);
    }
  }, []);
"""
    content = content.replace('return {', finalize_trivia + '\n  return {')
    content = content.replace('enterTrivia,', 'enterTrivia,\n    finalizeTrivia,')

with open('frontend/src/hooks/useContract.ts', 'w') as f:
    f.write(content)
