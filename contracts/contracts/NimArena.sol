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
    struct WordDuelRound {
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

    mapping(uint256 => WordDuelRound) public wordDuelRounds;
    mapping(uint256 => mapping(address => bool)) public wordDuelEntered;
    mapping(uint256 => mapping(address => bool)) public wordDuelScoreSubmitted;

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
    event WordDuelRoundCreated(uint256 indexed roundId, address indexed creator, address indexed token, uint256 entryFee, uint64 endTime);
    event WordDuelEntered(uint256 indexed roundId, address indexed player);
    event WordDuelScoreSubmitted(uint256 indexed roundId, address indexed player, uint256 score);
    event WordDuelFinalized(uint256 indexed roundId, address indexed winner, uint256 prize);

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

    function createWordDuelRound(
        address token,
        uint256 entryFee,
        uint64 durationSeconds
    ) external returns (uint256 duelId) {
        require(token == address(usdt) || token == address(nim), "NimArena: unsupported token");
        require(entryFee > 0, "NimArena: fee required");
        require(durationSeconds >= 60, "NimArena: too short");
        require(durationSeconds <= 86400, "NimArena: too long");

        duelId = nextDuelId++;
        WordDuelRound storage r = wordDuelRounds[duelId];
        r.creator = msg.sender;
        r.token = token;
        r.entryFee = entryFee;
        r.startTime = uint64(block.timestamp);
        r.endTime = uint64(block.timestamp) + durationSeconds;

        emit WordDuelRoundCreated(duelId, msg.sender, token, entryFee, r.endTime);
    }

    function enterWordDuel(uint256 duelId) external nonReentrant {
        WordDuelRound storage r = wordDuelRounds[duelId];
        require(r.entryFee > 0, "NimArena: round not found");
        require(block.timestamp < r.endTime, "NimArena: round ended");
        require(!wordDuelEntered[duelId][msg.sender], "NimArena: already entered");
        require(!r.finalized, "NimArena: already finalized");

        IERC20(r.token).safeTransferFrom(msg.sender, address(this), r.entryFee);

        wordDuelEntered[duelId][msg.sender] = true;
        r.poolBalance += r.entryFee;
        r.playerCount++;

        emit WordDuelEntered(duelId, msg.sender);
    }

    function submitWordDuelScore(
        uint256 duelId,
        uint256 score,
        bytes calldata backendProof
    ) external {
        WordDuelRound storage r = wordDuelRounds[duelId];
        require(r.entryFee > 0, "NimArena: round not found");
        require(block.timestamp <= r.endTime, "NimArena: round ended");
        require(wordDuelEntered[duelId][msg.sender], "NimArena: not entered");
        require(!wordDuelScoreSubmitted[duelId][msg.sender], "NimArena: already submitted");
        require(!r.finalized, "NimArena: already finalized");

        bytes32 messageHash = keccak256(
            abi.encodePacked(duelId, msg.sender, score)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        require(!usedProofs[ethSignedHash], "NimArena: proof already used");
        usedProofs[ethSignedHash] = true;

        address recovered = ethSignedHash.recover(backendProof);
        require(recovered == backendSigner, "NimArena: invalid proof");

        wordDuelScoreSubmitted[duelId][msg.sender] = true;

        if (score > r.topScore) {
            r.topScore = score;
            r.topScorer = msg.sender;
        }

        emit WordDuelScoreSubmitted(duelId, msg.sender, score);
    }

    function finalizeWordDuel(uint256 duelId) external nonReentrant {
        WordDuelRound storage r = wordDuelRounds[duelId];
        require(r.entryFee > 0, "NimArena: round not found");
        require(block.timestamp >= r.endTime, "NimArena: round not ended");
        require(!r.finalized, "NimArena: already finalized");

        r.finalized = true;

        if (r.topScorer == address(0) || r.poolBalance == 0) {
            emit WordDuelFinalized(duelId, address(0), 0);
            return;
        }

        uint256 fee = (r.poolBalance * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prize = r.poolBalance - fee;

        IERC20(r.token).safeTransfer(platformFeeAddress, fee);
        IERC20(r.token).safeTransfer(r.topScorer, prize);

        emit WordDuelFinalized(duelId, r.topScorer, prize);
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

    function getWordDuelRound(uint256 duelId) external view returns (
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
        WordDuelRound storage r = wordDuelRounds[duelId];
        return (
            r.creator, r.token, r.entryFee, r.startTime, r.endTime,
            r.topScorer, r.topScore, r.poolBalance, r.playerCount,
            r.finalized
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
    ) external nonReentrant {
        require(msg.sender == backendSigner, "NimArena: only backend can send daily reward");
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
