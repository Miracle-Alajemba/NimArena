import re

with open('frontend/src/components/lobby/GameGrid.tsx', 'r') as f:
    content = f.read()

# Add USDT_ADDRESS to imports
if "USDT_ADDRESS" not in content:
    content = content.replace('import { useApi } from "../../hooks/useApi";', 'import { useApi } from "../../hooks/useApi";\nimport { USDT_ADDRESS } from "../../config/constants";\nimport { formatToken } from "../../lib/formatters";')

old_logic = """        // Calculate duel prize pool (sum of fee * 2 for queued matches)
        let totalDuelPrize = 0;
        for (const d of duels) {
          const entryVal = parseFloat(d.entryFee);
          if (!isNaN(entryVal)) {
            totalDuelPrize += entryVal * 2;
          }
        }
        setDuelPrizePool(totalDuelPrize.toFixed(2));

        // Fetch active trivia rounds from backend
        const rounds = await get("/api/trivia/rounds");
        setActiveRoundsCount(rounds.length);

        // Calculate total trivia prize pools
        let totalTriviaPrize = 0;
        for (const r of rounds) {
          const poolVal = parseFloat(r.poolBalance);
          if (!isNaN(poolVal)) {
            totalTriviaPrize += poolVal;
          }
        }
        setTriviaPrizePool(totalTriviaPrize.toFixed(2));"""

new_logic = """        // Calculate duel prize pool (sum of fee * 2 for queued matches)
        let totalDuelUSDT = 0;
        let totalDuelNIM = 0;
        for (const d of duels) {
          if (d.tokenAddress && d.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const entryVal = parseFloat(formatToken(d.entryFee, 6));
            if (!isNaN(entryVal)) totalDuelUSDT += entryVal * 2;
          } else {
            const entryVal = parseFloat(formatToken(d.entryFee, 18));
            if (!isNaN(entryVal)) totalDuelNIM += entryVal * 2;
          }
        }
        
        let duelPrizeStr = "";
        if (totalDuelUSDT > 0) duelPrizeStr += `${totalDuelUSDT.toFixed(2)} USDT Pot `;
        if (totalDuelNIM > 0) duelPrizeStr += `${totalDuelNIM.toFixed(2)} NIM Pot`;
        if (!duelPrizeStr) duelPrizeStr = "0.00 USDT Pot";
        setDuelPrizePool(duelPrizeStr.trim());

        // Fetch active trivia rounds from backend
        const rounds = await get("/api/trivia/rounds");
        setActiveRoundsCount(rounds.length);

        // Calculate total trivia prize pools
        let totalTriviaUSDT = 0;
        let totalTriviaNIM = 0;
        for (const r of rounds) {
          if (r.tokenAddress && r.tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            const poolVal = parseFloat(formatToken(r.poolBalance, 6));
            if (!isNaN(poolVal)) totalTriviaUSDT += poolVal;
          } else {
            const poolVal = parseFloat(formatToken(r.poolBalance, 18));
            if (!isNaN(poolVal)) totalTriviaNIM += poolVal;
          }
        }
        
        let triviaPrizeStr = "";
        if (totalTriviaUSDT > 0) triviaPrizeStr += `${totalTriviaUSDT.toFixed(2)} USDT Pot `;
        if (totalTriviaNIM > 0) triviaPrizeStr += `${totalTriviaNIM.toFixed(2)} NIM Pot`;
        if (!triviaPrizeStr) triviaPrizeStr = "0.00 USDT Pot";
        setTriviaPrizePool(triviaPrizeStr.trim());"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    
    # Also fix details JSX mapping since now duelPrizePool and triviaPrizePool contain the currency strings natively
    content = content.replace("details={`${openDuelsCount} open • ${duelPrizePool} USDT Pot`}", "details={`${openDuelsCount} open • ${duelPrizePool}`}")
    content = content.replace("details={`${activeRoundsCount} rounds • ${triviaPrizePool} USDT`}", "details={`${activeRoundsCount} rounds • ${triviaPrizePool}`}")

    with open('frontend/src/components/lobby/GameGrid.tsx', 'w') as f:
        f.write(content)
    print("Success: GameGrid updated")
else:
    print("Error: GameGrid logic not found")
