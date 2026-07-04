import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { NimArena, MockERC20 } from "../typechain-types";

describe("NimArena Contract", function () {
  let arena: NimArena;
  let usdt: MockERC20;
  let nim: MockERC20;
  let owner: SignerWithAddress;
  let platformFee: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;

  beforeEach(async function () {
    [owner, platformFee, backendSigner, player1, player2] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    // Deploy Mock USDT (6 decimals)
    usdt = (await MockERC20Factory.deploy("Mock USDT", "USDT", 6)) as MockERC20;
    await usdt.waitForDeployment();

    // Deploy Mock NIM (18 decimals)
    nim = (await MockERC20Factory.deploy("Mock NIM", "NIM", 18)) as MockERC20;
    await nim.waitForDeployment();

    // Deploy NimArena
    const NimArenaFactory = await ethers.getContractFactory("NimArena");
    arena = (await NimArenaFactory.deploy(
      await usdt.getAddress(),
      await nim.getAddress(),
      platformFee.address,
      backendSigner.address
    )) as NimArena;
    await arena.waitForDeployment();

    // Distribute tokens to players
    const initialUSDT = ethers.parseUnits("100", 6);
    const initialNIM = ethers.parseUnits("1000", 18);
    
    await usdt.transfer(player1.address, initialUSDT);
    await usdt.transfer(player2.address, initialUSDT);
    
    await nim.transfer(player1.address, initialNIM);
    await nim.transfer(player2.address, initialNIM);

    // Approve tokens to NimArena contract
    await usdt.connect(player1).approve(await arena.getAddress(), ethers.MaxUint256);
    await usdt.connect(player2).approve(await arena.getAddress(), ethers.MaxUint256);
    
    await nim.connect(player1).approve(await arena.getAddress(), ethers.MaxUint256);
    await nim.connect(player2).approve(await arena.getAddress(), ethers.MaxUint256);
  });

  describe("Word Duel", function () {
    it("should allow creating a duel", async function () {
      const entryFee = ethers.parseUnits("10", 6); // 10 USDT
      const word = "hello";
      const salt = ethers.randomBytes(32);
      const hash = ethers.solidityPackedKeccak256(["string", "bytes32"], [word, salt]);

      const initialBal = await usdt.balanceOf(player1.address);
      
      await expect(arena.connect(player1).createDuel(await usdt.getAddress(), entryFee, hash))
        .to.emit(arena, "DuelCreated")
        .withArgs(1, player1.address, await usdt.getAddress(), entryFee);

      const finalBal = await usdt.balanceOf(player1.address);
      expect(initialBal - finalBal).to.equal(entryFee);

      const duel = await arena.duels(1);
      expect(duel.player1).to.equal(player1.address);
      expect(duel.entryFee).to.equal(entryFee);
      expect(duel.word1Hash).to.equal(hash);
      expect(duel.player2).to.equal(ethers.ZeroAddress);
    });

    it("should allow joining a duel", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      const word1 = "hello";
      const salt1 = ethers.randomBytes(32);
      const hash1 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word1, salt1]);

      await arena.connect(player1).createDuel(await usdt.getAddress(), entryFee, hash1);

      const word2 = "world";
      const salt2 = ethers.randomBytes(32);
      const hash2 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word2, salt2]);

      const initialBal = await usdt.balanceOf(player2.address);

      await expect(arena.connect(player2).joinDuel(1, hash2))
        .to.emit(arena, "DuelJoined")
        .withArgs(1, player2.address);

      const finalBal = await usdt.balanceOf(player2.address);
      expect(initialBal - finalBal).to.equal(entryFee);

      const duel = await arena.duels(1);
      expect(duel.player2).to.equal(player2.address);
      expect(duel.word2Hash).to.equal(hash2);
    });

    it("should allow revealing and finalization - player 1 wins (longer word)", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      const word1 = "longerword"; // length 10
      const salt1 = ethers.randomBytes(32);
      const hash1 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word1, salt1]);
      await arena.connect(player1).createDuel(await usdt.getAddress(), entryFee, hash1);

      const word2 = "short"; // length 5
      const salt2 = ethers.randomBytes(32);
      const hash2 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word2, salt2]);
      await arena.connect(player2).joinDuel(1, hash2);

      // Reveal
      await expect(arena.connect(player1).revealWord(1, word1, salt1))
        .to.emit(arena, "WordRevealed")
        .withArgs(1, player1.address, word1);

      await expect(arena.connect(player2).revealWord(1, word2, salt2))
        .to.emit(arena, "WordRevealed")
        .withArgs(1, player2.address, word2);

      // Finalize
      const initialBalP1 = await usdt.balanceOf(player1.address);
      const initialBalFee = await usdt.balanceOf(platformFee.address);

      // Total pot = 20 USDT, 5% fee = 1 USDT, Prize = 19 USDT
      const expectedPrize = ethers.parseUnits("19", 6);
      const expectedFee = ethers.parseUnits("1", 6);

      await expect(arena.finalizeDuel(1))
        .to.emit(arena, "DuelFinalized")
        .withArgs(1, player1.address, expectedPrize);

      const finalBalP1 = await usdt.balanceOf(player1.address);
      const finalBalFee = await usdt.balanceOf(platformFee.address);

      expect(finalBalP1 - initialBalP1).to.equal(expectedPrize);
      expect(finalBalFee - initialBalFee).to.equal(expectedFee);

      const duel = await arena.duels(1);
      expect(duel.finalized).to.be.true;
      expect(duel.winner).to.equal(1); // player1
    });

    it("should refund on draw (equal word length)", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      const word1 = "cats"; // length 4
      const salt1 = ethers.randomBytes(32);
      const hash1 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word1, salt1]);
      await arena.connect(player1).createDuel(await usdt.getAddress(), entryFee, hash1);

      const word2 = "dogs"; // length 4
      const salt2 = ethers.randomBytes(32);
      const hash2 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word2, salt2]);
      await arena.connect(player2).joinDuel(1, hash2);

      await arena.connect(player1).revealWord(1, word1, salt1);
      await arena.connect(player2).revealWord(1, word2, salt2);

      const initialBalP1 = await usdt.balanceOf(player1.address);
      const initialBalP2 = await usdt.balanceOf(player2.address);
      const initialBalFee = await usdt.balanceOf(platformFee.address);

      // Draw: each refunded entryFee minus 2.5% fee
      // Entry = 10. Fee per player = 0.5. Refund per player = 9.5
      const expectedRefund = ethers.parseUnits("9.5", 6);
      const expectedFee = ethers.parseUnits("1", 6); // 5% of 20 pot

      await arena.finalizeDuel(1);

      expect(await usdt.balanceOf(player1.address) - initialBalP1).to.equal(expectedRefund);
      expect(await usdt.balanceOf(player2.address) - initialBalP2).to.equal(expectedRefund);
      expect(await usdt.balanceOf(platformFee.address) - initialBalFee).to.equal(expectedFee);

      const duel = await arena.duels(1);
      expect(duel.finalized).to.be.true;
      expect(duel.winner).to.equal(3); // draw
    });

    it("should allow cancel duel if no opponent joins", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      const word1 = "hello";
      const salt1 = ethers.randomBytes(32);
      const hash1 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word1, salt1]);
      await arena.connect(player1).createDuel(await usdt.getAddress(), entryFee, hash1);

      const initialBal = await usdt.balanceOf(player1.address);

      await arena.connect(player1).cancelDuel(1);

      const finalBal = await usdt.balanceOf(player1.address);
      expect(finalBal - initialBal).to.equal(entryFee);

      const duel = await arena.duels(1);
      expect(duel.finalized).to.be.true;
      expect(duel.winner).to.equal(3);
    });
  });

  describe("Speed Trivia", function () {
    it("should allow creating a trivia round", async function () {
      const entryFee = ethers.parseUnits("5", 6);
      const duration = 300; // 5 mins

      await expect(arena.connect(owner).createTriviaRound(await usdt.getAddress(), entryFee, duration))
        .to.emit(arena, "TriviaRoundCreated");

      const round = await arena.triviaRounds(1);
      expect(round.entryFee).to.equal(entryFee);
      expect(round.finalized).to.be.false;
    });

    it("should allow entering a round", async function () {
      const entryFee = ethers.parseUnits("5", 6);
      await arena.connect(owner).createTriviaRound(await usdt.getAddress(), entryFee, 300);

      const initialBal = await usdt.balanceOf(player1.address);

      await expect(arena.connect(player1).enterTrivia(1))
        .to.emit(arena, "TriviaEntered")
        .withArgs(1, player1.address);

      const finalBal = await usdt.balanceOf(player1.address);
      expect(initialBal - finalBal).to.equal(entryFee);

      const round = await arena.triviaRounds(1);
      expect(round.poolBalance).to.equal(entryFee);
      expect(round.playerCount).to.equal(1);
      expect(await arena.triviaEntered(1, player1.address)).to.be.true;
    });

    it("should allow score submission with valid backend signature", async function () {
      const entryFee = ethers.parseUnits("5", 6);
      await arena.connect(owner).createTriviaRound(await usdt.getAddress(), entryFee, 300);
      await arena.connect(player1).enterTrivia(1);

      const score = 850;
      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "address", "uint256"],
        [1, player1.address, score]
      );
      
      const messageHashBytes = ethers.getBytes(messageHash);
      const signature = await backendSigner.signMessage(messageHashBytes);

      await expect(arena.connect(player1).submitTriviaScore(1, score, signature))
        .to.emit(arena, "TriviaScoreSubmitted")
        .withArgs(1, player1.address, score);

      const round = await arena.triviaRounds(1);
      expect(round.topScore).to.equal(score);
      expect(round.topScorer).to.equal(player1.address);
    });

    it("should reject score submission with invalid signature", async function () {
      const entryFee = ethers.parseUnits("5", 6);
      await arena.connect(owner).createTriviaRound(await usdt.getAddress(), entryFee, 300);
      await arena.connect(player1).enterTrivia(1);

      const score = 850;
      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "address", "uint256"],
        [1, player1.address, score]
      );
      const messageHashBytes = ethers.getBytes(messageHash);
      const signature = await player2.signMessage(messageHashBytes);

      await expect(arena.connect(player1).submitTriviaScore(1, score, signature))
        .to.be.revertedWith("NimArena: invalid proof");
    });

    it("should finalize and pay top scorer", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      await arena.connect(owner).createTriviaRound(await usdt.getAddress(), entryFee, 60); // 60 sec duration
      
      await arena.connect(player1).enterTrivia(1);
      await arena.connect(player2).enterTrivia(1);

      const score1 = 800;
      const msgHash1 = ethers.solidityPackedKeccak256(["uint256", "address", "uint256"], [1, player1.address, score1]);
      const sig1 = await backendSigner.signMessage(ethers.getBytes(msgHash1));
      await arena.connect(player1).submitTriviaScore(1, score1, sig1);

      const score2 = 950;
      const msgHash2 = ethers.solidityPackedKeccak256(["uint256", "address", "uint256"], [1, player2.address, score2]);
      const sig2 = await backendSigner.signMessage(ethers.getBytes(msgHash2));
      await arena.connect(player2).submitTriviaScore(1, score2, sig2);

      await ethers.provider.send("evm_increaseTime", [70]);
      await ethers.provider.send("evm_mine", []);

      const initialBalP2 = await usdt.balanceOf(player2.address);
      const initialBalFee = await usdt.balanceOf(platformFee.address);

      const expectedPrize = ethers.parseUnits("19", 6);
      const expectedFee = ethers.parseUnits("1", 6);

      await expect(arena.finalizeTrivia(1))
        .to.emit(arena, "TriviaFinalized")
        .withArgs(1, player2.address, expectedPrize);

      expect(await usdt.balanceOf(player2.address) - initialBalP2).to.equal(expectedPrize);
      expect(await usdt.balanceOf(platformFee.address) - initialBalFee).to.equal(expectedFee);

      const round = await arena.triviaRounds(1);
      expect(round.finalized).to.be.true;
    });
  });

  describe("Daily Challenge & Withdrawals", function () {
    it("should allow owner to send daily rewards from contract funds", async function () {
      const rewardAmount = ethers.parseUnits("1.5", 6);
      
      await usdt.connect(player1).transfer(await arena.getAddress(), ethers.parseUnits("10", 6));
      
      const initialBal = await usdt.balanceOf(player2.address);
      
      await expect(arena.connect(owner).sendDailyReward(await usdt.getAddress(), player2.address, rewardAmount))
        .to.emit(arena, "DailyRewardSent")
        .withArgs(await usdt.getAddress(), player2.address, rewardAmount);
        
      const finalBal = await usdt.balanceOf(player2.address);
      expect(finalBal - initialBal).to.equal(rewardAmount);
    });

    it("should reject daily rewards sent by non-owner", async function () {
      const rewardAmount = ethers.parseUnits("1.5", 6);
      await expect(
        arena.connect(player1).sendDailyReward(await usdt.getAddress(), player2.address, rewardAmount)
      ).to.be.revertedWith("NimArena: owner only");
    });

    it("should allow owner to withdraw accumulated funds", async function () {
      const withdrawAmount = ethers.parseUnits("2", 6);
      
      await usdt.connect(player1).transfer(await arena.getAddress(), ethers.parseUnits("5", 6));
      
      const initialBal = await usdt.balanceOf(owner.address);
      
      await arena.connect(owner).withdrawToken(await usdt.getAddress(), owner.address, withdrawAmount);
      
      const finalBal = await usdt.balanceOf(owner.address);
      expect(finalBal - initialBal).to.equal(withdrawAmount);
    });

    it("should reject withdrawals from non-owner", async function () {
      const withdrawAmount = ethers.parseUnits("2", 6);
      await expect(
        arena.connect(player1).withdrawToken(await usdt.getAddress(), player1.address, withdrawAmount)
      ).to.be.revertedWith("NimArena: owner only");
    });
  });

  describe("NIM Token Duel Verification", function () {
    it("should allow hosting, joining, and winning a duel in NIM", async function () {
      const entryFee = ethers.parseUnits("50", 18); // 50 NIM
      const word1 = "nimtoken"; // length 8
      const salt1 = ethers.randomBytes(32);
      const hash1 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word1, salt1]);
      
      await arena.connect(player1).createDuel(await nim.getAddress(), entryFee, hash1);

      const word2 = "yes"; // length 3
      const salt2 = ethers.randomBytes(32);
      const hash2 = ethers.solidityPackedKeccak256(["string", "bytes32"], [word2, salt2]);
      
      await arena.connect(player2).joinDuel(1, hash2);

      await arena.connect(player1).revealWord(1, word1, salt1);
      await arena.connect(player2).revealWord(1, word2, salt2);

      const initialBalP1 = await nim.balanceOf(player1.address);
      const initialBalFee = await nim.balanceOf(platformFee.address);

      // Pot = 100 NIM. 5% fee = 5 NIM. Prize = 95 NIM.
      const expectedPrize = ethers.parseUnits("95", 18);
      const expectedFee = ethers.parseUnits("5", 18);

      await expect(arena.finalizeDuel(1))
        .to.emit(arena, "DuelFinalized")
        .withArgs(1, player1.address, expectedPrize);

      expect(await nim.balanceOf(player1.address) - initialBalP1).to.equal(expectedPrize);
      expect(await nim.balanceOf(platformFee.address) - initialBalFee).to.equal(expectedFee);
    });
  });
});
