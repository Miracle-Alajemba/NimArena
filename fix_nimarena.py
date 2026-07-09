import re

with open('contracts/contracts/NimArena.sol', 'r') as f:
    content = f.read()

old_func = """    function finalizeDuel(uint256 duelId) external nonReentrant {
        Duel storage d = duels[duelId];
        require(!d.finalized, "NimArena: already finalized");
        require(
            bytes(d.word1Revealed).length > 0 && bytes(d.word2Revealed).length > 0,
            "NimArena: both must reveal"
        );

        d.finalized = true;
        uint256 totalPot = d.entryFee * 2;
        uint256 fee = (totalPot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prize = totalPot - fee;

        uint256 len1 = bytes(d.word1Revealed).length;
        uint256 len2 = bytes(d.word2Revealed).length;

        address winner;
        if (len1 > len2) {
            d.winner = 1;
            winner = d.player1;
        } else if (len2 > len1) {
            d.winner = 2;
            winner = d.player2;
        } else {
            d.winner = 3;
            uint256 halfFee = fee / 2;
            uint256 refund1 = d.entryFee - halfFee;
            uint256 refund2 = d.entryFee - (fee - halfFee);

            IERC20(d.token).safeTransfer(platformFeeAddress, fee);
            IERC20(d.token).safeTransfer(d.player1, refund1);
            IERC20(d.token).safeTransfer(d.player2, refund2);

            emit DuelFinalized(duelId, address(0), 0);
            return;
        }

        IERC20(d.token).safeTransfer(platformFeeAddress, fee);
        IERC20(d.token).safeTransfer(winner, prize);

        emit DuelFinalized(duelId, winner, prize);
    }"""

new_func = """    function finalizeDuel(uint256 duelId, uint8 backendWinnerIndex, bytes calldata signature) external nonReentrant {
        Duel storage d = duels[duelId];
        require(!d.finalized, "NimArena: already finalized");
        require(
            bytes(d.word1Revealed).length > 0 && bytes(d.word2Revealed).length > 0,
            "NimArena: both must reveal"
        );

        // Verify Backend Signature
        bytes32 messageHash = keccak256(abi.encodePacked(duelId, backendWinnerIndex));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        require(ethSignedHash.recover(signature) == backendSigner, "NimArena: invalid backend signature");

        d.finalized = true;
        d.winner = backendWinnerIndex;
        uint256 totalPot = d.entryFee * 2;
        uint256 fee = (totalPot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prize = totalPot - fee;

        if (d.winner == 3) { // Draw
            uint256 halfFee = fee / 2;
            uint256 refund1 = d.entryFee - halfFee;
            uint256 refund2 = d.entryFee - (fee - halfFee);

            IERC20(d.token).safeTransfer(platformFeeAddress, fee);
            IERC20(d.token).safeTransfer(d.player1, refund1);
            IERC20(d.token).safeTransfer(d.player2, refund2);

            emit DuelFinalized(duelId, address(0), 0);
            return;
        }

        address winnerAddr = (d.winner == 1) ? d.player1 : d.player2;
        IERC20(d.token).safeTransfer(platformFeeAddress, fee);
        IERC20(d.token).safeTransfer(winnerAddr, prize);

        emit DuelFinalized(duelId, winnerAddr, prize);
    }"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open('contracts/contracts/NimArena.sol', 'w') as f:
        f.write(content)
    print("Success: finalizeDuel replaced")
else:
    print("Error: finalizeDuel not found")
