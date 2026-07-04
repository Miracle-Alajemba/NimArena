// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NimArena
/// @notice Competitive game hub contract for Word Duel and Speed Trivia on Base.
///         Supports both USDT and NIM as stake/reward tokens.
contract NimArena is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ─── Constants ───────────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─── Immutables ──────────────────────────────────────────────────────
    IERC20 public immutable usdt;
    IERC20 public immutable nim;
    address public immutable platformFeeAddress;
    address public immutable backendSigner;

    // ─── State ───────────────────────────────────────────────────────────
    address public owner;
    uint256 public nextDuelId = 1;
    uint256 public nextRoundId = 1;

    // ─── Word Duel ───────────────────────────────────────────────────────
    struct Duel {
        address player1;
        address player2;
        address token;
        uint256 entryFee;
        bytes32 word1Hash;
        bytes32 word2Hash;
        string word1Revealed;
        string word2Revealed;
        uint64 createdAt;
        uint8 winner; // 0=pending, 1=player1, 2=player2, 3=draw
        bool finalized;
    }

    mapping(uint256 => Duel) public duels;

    // ─── Speed Trivia ────────────────────────────────────────────────────
    struct TriviaRound {
        address creator;
        address token;
        uint256 entryFee;
        uint64 startTime;
        uint64 endTime;
        address topScorer;
        uint256 topScore;
        uint256 poolBalance;
        uint256 playerCount;
        bool finalized;
    }

    mapping(uint256 => TriviaRound) public triviaRounds;
    mapping(uint256 => mapping(address => bool)) public triviaEntered;
    mapping(uint256 => mapping(address => bool)) public triviaScoreSubmitted;
    mapping(bytes32 => bool) public usedProofs;

    // ─── Events ──────────────────────────────────────────────────────────
    event DuelCreated(uint256 indexed duelId, address indexed player1, address indexed token, uint256 entryFee);
    event DuelJoined(uint256 indexed duelId, address indexed player2);
    event WordRevealed(uint256 indexed duelId, address indexed player, string word);
    event DuelFinalized(uint256 indexed duelId, address indexed winner, uint256 prize);

    event TriviaRoundCreated(uint256 indexed roundId, address indexed creator, address indexed token, uint256 entryFee, uint64 endTime);
    event TriviaEntered(uint256 indexed roundId, address indexed player);
    event TriviaScoreSubmitted(uint256 indexed roundId, address indexed player, uint256 score);
    event TriviaFinalized(uint256 indexed roundId, address indexed winner, uint256 prize);

    event DailyRewardSent(address indexed token, address indexed player, uint256 amount);

    // ─── Modifiers ───────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "NimArena: owner only");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor(
        address _usdt,
        address _nim,
        address _platformFeeAddress,
        address _backendSigner
    ) {
        require(_usdt != address(0), "NimArena: invalid USDT address");
        require(_nim != address(0), "NimArena: invalid NIM address");
        require(_platformFeeAddress != address(0), "NimArena: invalid fee address");
        require(_backendSigner != address(0), "NimArena: invalid signer");

        usdt = IERC20(_usdt);
        nim = IERC20(_nim);
        platformFeeAddress = _platformFeeAddress;
        backendSigner = _backendSigner;
        owner = msg.sender;
    }

    // ═════════════════════════════════════════════════════════════════════
    //                          WORD DUEL
    // ═════════════════════════════════════════════════════════════════════

    function createDuel(
        address token,
        uint256 entryFee,
        bytes32 wordHash
    ) external nonReentrant returns (uint256 duelId) {
        require(token == address(usdt) || token == address(nim), "NimArena: unsupported token");
        require(entryFee > 0, "NimArena: fee required");
        require(wordHash != bytes32(0), "NimArena: invalid hash");

        IERC20(token).safeTransferFrom(msg.sender, address(this), entryFee);

        duelId = nextDuelId++;
        Duel storage d = duels[duelId];
        d.player1 = msg.sender;
        d.token = token;
        d.entryFee = entryFee;
        d.word1Hash = wordHash;
        d.createdAt = uint64(block.timestamp);

        emit DuelCreated(duelId, msg.sender, token, entryFee);
    }

    function joinDuel(
        uint256 duelId,
        bytes32 wordHash
    ) external nonReentrant {
        Duel storage d = duels[duelId];
        require(d.player1 != address(0), "NimArena: duel not found");
        require(d.player2 == address(0), "NimArena: duel full");
        require(msg.sender != d.player1, "NimArena: cannot join own duel");
        require(wordHash != bytes32(0), "NimArena: invalid hash");

        IERC20(d.token).safeTransferFrom(msg.sender, address(this), d.entryFee);

        d.player2 = msg.sender;
        d.word2Hash = wordHash;

        emit DuelJoined(duelId, msg.sender);
    }

    function revealWord(
        uint256 duelId,
        string calldata word,
        bytes32 salt
    ) external {
        Duel storage d = duels[duelId];
        require(!d.finalized, "NimArena: already finalized");
        require(
            msg.sender == d.player1 || msg.sender == d.player2,
            "NimArena: not a player"
        );
        require(d.player2 != address(0), "NimArena: no opponent yet");

        bytes32 computedHash = keccak256(abi.encodePacked(word, salt));

        if (msg.sender == d.player1) {
            require(bytes(d.word1Revealed).length == 0, "NimArena: already revealed");
            require(computedHash == d.word1Hash, "NimArena: hash mismatch");
            d.word1Revealed = word;
        } else {
            require(bytes(d.word2Revealed).length == 0, "NimArena: already revealed");
            require(computedHash == d.word2Hash, "NimArena: hash mismatch");
            d.word2Revealed = word;
        }

        emit WordRevealed(duelId, msg.sender, word);
    }

    function finalizeDuel(uint256 duelId) external nonReentrant {
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
    }

    function cancelDuel(uint256 duelId) external nonReentrant {
        Duel storage d = duels[duelId];
        require(msg.sender == d.player1, "NimArena: not player1");
        require(d.player2 == address(0), "NimArena: opponent joined");
        require(!d.finalized, "NimArena: already finalized");

        d.finalized = true;
        d.winner = 3;
        IERC20(d.token).safeTransfer(d.player1, d.entryFee);
    }

    // ═════════════════════════════════════════════════════════════════════
    //                         SPEED TRIVIA
    // ═════════════════════════════════════════════════════════════════════

    function createTriviaRound(
        address token,
        uint256 entryFee,
        uint64 durationSeconds
    ) external returns (uint256 roundId) {
        require(token == address(usdt) || token == address(nim), "NimArena: unsupported token");
        require(entryFee > 0, "NimArena: fee required");
        require(durationSeconds >= 60, "NimArena: too short");
        require(durationSeconds <= 86400, "NimArena: too long");

        roundId = nextRoundId++;
        TriviaRound storage r = triviaRounds[roundId];
        r.creator = msg.sender;
        r.token = token;
        r.entryFee = entryFee;
        r.startTime = uint64(block.timestamp);
        r.endTime = uint64(block.timestamp) + durationSeconds;

        emit TriviaRoundCreated(roundId, msg.sender, token, entryFee, r.endTime);
    }

    function enterTrivia(uint256 roundId) external nonReentrant {
        TriviaRound storage r = triviaRounds[roundId];
        require(r.entryFee > 0, "NimArena: round not found");
        require(block.timestamp < r.endTime, "NimArena: round ended");
        require(!triviaEntered[roundId][msg.sender], "NimArena: already entered");
        require(!r.finalized, "NimArena: already finalized");

        IERC20(r.token).safeTransferFrom(msg.sender, address(this), r.entryFee);

        triviaEntered[roundId][msg.sender] = true;
        r.poolBalance += r.entryFee;
        r.playerCount++;

        emit TriviaEntered(roundId, msg.sender);
    }

    function submitTriviaScore(
        uint256 roundId,
        uint256 score,
        bytes calldata backendProof
    ) external {
        TriviaRound storage r = triviaRounds[roundId];
        require(r.entryFee > 0, "NimArena: round not found");
        require(block.timestamp <= r.endTime, "NimArena: round ended");
        require(triviaEntered[roundId][msg.sender], "NimArena: not entered");
        require(!triviaScoreSubmitted[roundId][msg.sender], "NimArena: already submitted");
        require(!r.finalized, "NimArena: already finalized");

        bytes32 messageHash = keccak256(
            abi.encodePacked(roundId, msg.sender, score)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        require(!usedProofs[ethSignedHash], "NimArena: proof already used");
        usedProofs[ethSignedHash] = true;

        address recovered = ethSignedHash.recover(backendProof);
        require(recovered == backendSigner, "NimArena: invalid proof");

        triviaScoreSubmitted[roundId][msg.sender] = true;

        if (score > r.topScore) {
            r.topScore = score;
            r.topScorer = msg.sender;
        }

        emit TriviaScoreSubmitted(roundId, msg.sender, score);
    }

    function finalizeTrivia(uint256 roundId) external nonReentrant {
        TriviaRound storage r = triviaRounds[roundId];
        require(r.entryFee > 0, "NimArena: round not found");
        require(block.timestamp >= r.endTime, "NimArena: round not ended");
        require(!r.finalized, "NimArena: already finalized");

        r.finalized = true;

        if (r.topScorer == address(0) || r.poolBalance == 0) {
            emit TriviaFinalized(roundId, address(0), 0);
            return;
        }

        uint256 fee = (r.poolBalance * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prize = r.poolBalance - fee;

        IERC20(r.token).safeTransfer(platformFeeAddress, fee);
        IERC20(r.token).safeTransfer(r.topScorer, prize);

        emit TriviaFinalized(roundId, r.topScorer, prize);
    }

    // ═════════════════════════════════════════════════════════════════════
    //                           VIEWS
    // ═════════════════════════════════════════════════════════════════════

    function getDuel(uint256 duelId) external view returns (
        address player1,
        address player2,
        address token,
        uint256 entryFee,
        bytes32 word1Hash,
        bytes32 word2Hash,
        string memory word1Revealed,
        string memory word2Revealed,
        uint64 createdAt,
        uint8 winner,
        bool finalized
    ) {
        Duel storage d = duels[duelId];
        return (
            d.player1, d.player2, d.token, d.entryFee,
            d.word1Hash, d.word2Hash,
            d.word1Revealed, d.word2Revealed,
            d.createdAt, d.winner, d.finalized
        );
    }

    function getTriviaRound(uint256 roundId) external view returns (
        address creator,
        address token,
        uint256 entryFee,
        uint64 startTime,
        uint64 endTime,
        address topScorer,
        uint256 topScore,
        uint256 poolBalance,
        uint256 playerCount,
        bool finalized
    ) {
        TriviaRound storage r = triviaRounds[roundId];
        return (
            r.creator, r.token, r.entryFee, r.startTime, r.endTime,
            r.topScorer, r.topScore, r.poolBalance, r.playerCount,
            r.finalized
        );
    }

    // ─── Daily Challenge & Withdrawals ───────────────────────────────────

    function sendDailyReward(
        address token,
        address player,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(token == address(usdt) || token == address(nim), "NimArena: unsupported token");
        require(player != address(0), "NimArena: invalid address");
        require(amount > 0, "NimArena: amount required");
        require(
            IERC20(token).balanceOf(address(this)) >= amount,
            "NimArena: insufficient balance for daily reward"
        );
        IERC20(token).safeTransfer(player, amount);
        emit DailyRewardSent(token, player, amount);
    }

    function withdrawToken(
        address token,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(token == address(usdt) || token == address(nim), "NimArena: unsupported token");
        require(recipient != address(0), "NimArena: invalid recipient");
        require(amount > 0, "NimArena: amount required");
        require(
            IERC20(token).balanceOf(address(this)) >= amount,
            "NimArena: insufficient balance to withdraw"
        );
        IERC20(token).safeTransfer(recipient, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "NimArena: invalid owner");
        owner = newOwner;
    }
}
