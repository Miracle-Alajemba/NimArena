import re

with open('backend/src/socket/duelMatchmaking.ts', 'r') as f:
    content = f.read()

# Fix the async callback issue
content = content.replace("prisma.duelMatch.findUnique({ where: { id: matchId } }).then((match) => {", "prisma.duelMatch.findUnique({ where: { id: matchId } }).then(async (match) => {")

# Fix chainDuelId to duelId
content = content.replace("[match.chainDuelId, winnerIndex]", "[match.duelId, winnerIndex]")

with open('backend/src/socket/duelMatchmaking.ts', 'w') as f:
    f.write(content)
print("Success: duelMatchmaking errors fixed")
