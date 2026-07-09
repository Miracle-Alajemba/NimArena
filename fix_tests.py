import re

with open('contracts/test/NimArena.test.ts', 'r') as f:
    content = f.read()

# For the daily reward test (non-backend)
content = re.sub(
    r'arena\.connect\(player1\)\.sendDailyReward\((.*?)\)\s*\)\.to\.be\.revertedWith\(".*?"\);',
    r'arena.connect(player1).sendDailyReward(\1)\n      ).to.be.revertedWith("NimArena: only backend can send daily reward");',
    content
)

# For the withdraw test (non-owner)
content = re.sub(
    r'arena\.connect\(player1\)\.withdrawToken\((.*?)\)\s*\)\.to\.be\.revertedWith\(".*?"\);',
    r'arena.connect(player1).withdrawToken(\1)\n      ).to.be.revertedWith("NimArena: owner only");',
    content
)

with open('contracts/test/NimArena.test.ts', 'w') as f:
    f.write(content)
print("Success: test assertions fixed")
