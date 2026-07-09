import re

with open('contracts/contracts/NimArena.sol', 'r') as f:
    content = f.read()

old_func = """    function sendDailyReward(
        address token,
        address player,
        uint256 amount
    ) external onlyOwner nonReentrant {"""

new_func = """    function sendDailyReward(
        address token,
        address player,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == backendSigner, "NimArena: only backend can send daily reward");"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open('contracts/contracts/NimArena.sol', 'w') as f:
        f.write(content)
    print("Success: sendDailyReward replaced")
else:
    print("Error: sendDailyReward not found")
