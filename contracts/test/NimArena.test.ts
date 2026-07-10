import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { NimArena, MockERC20 } from "../typechain-types";

describe("NimArena Contract", function () {

    async function signWordDuelResult(duelId: number, playerAddress: string, score: number): Promise<string> {
        const messageHash = ethers.solidityPackedKeccak256(
            ["uint256", "address", "uint256"],
            [duelId, playerAddress, score]
        );
        return backendSigner.signMessage(ethers.getBytes(messageHash));
    }

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

  describe("Word Duel Rounds", function () {
    it("should allow creating a word duel round", async function () {
      const entryFee = ethers.parseUnits("10", 6); // 10 USDT
      const duration = 300; // 5 mins

      await expect(arena.connect(owner).createWordDuelRound(await usdt.getAddress(), entryFee, duration))
        .to.emit(arena, "WordDuelRoundCreated");

      const round = await arena.wordDuelRounds(1);
      expect(round.entryFee).to.equal(entryFee);
      expect(round.finalized).to.be.false;
    });

    it("should allow entering a round", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      await arena.connect(owner).createWordDuelRound(await usdt.getAddress(), entryFee, 300);

      const initialBal = await usdt.balanceOf(player1.address);

      await expect(arena.connect(player1).enterWordDuel(1))
        .to.emit(arena, "WordDuelEntered")
        .withArgs(1, player1.address);

      const finalBal = await usdt.balanceOf(player1.address);
      expect(initialBal - finalBal).to.equal(entryFee);

      const round = await arena.wordDuelRounds(1);
      expect(round.poolBalance).to.equal(entryFee);
      expect(round.playerCount).to.equal(1);
      expect(await arena.wordDuelEntered(1, player1.address)).to.be.true;
    });

    it("should allow score submission with valid backend signature", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      await arena.connect(owner).createWordDuelRound(await usdt.getAddress(), entryFee, 300);
      await arena.connect(player1).enterWordDuel(1);

      const score = 120;
      const signature = await signWordDuelResult(1, player1.address, score);

      await expect(arena.connect(player1).submitWordDuelScore(1, score, signature))
        .to.emit(arena, "WordDuelScoreSubmitted")
        .withArgs(1, player1.address, score);

      const round = await arena.wordDuelRounds(1);
      expect(round.topScore).to.equal(score);
      expect(round.topScorer).to.equal(player1.address);
    });

    it("should finalize and pay top scorer", async function () {
      const entryFee = ethers.parseUnits("10", 6);
      await arena.connect(owner).createWordDuelRound(await usdt.getAddress(), entryFee, 60);

      await arena.connect(player1).enterWordDuel(1);
      await arena.connect(player2).enterWordDuel(1);

      const score1 = 80;
      const sig1 = await signWordDuelResult(1, player1.address, score1);
      await arena.connect(player1).submitWordDuelScore(1, score1, sig1);

      const score2 = 150;
      const sig2 = await signWordDuelResult(1, player2.address, score2);
      await arena.connect(player2).submitWordDuelScore(1, score2, sig2);

      await ethers.provider.send("evm_increaseTime", [70]);
      await ethers.provider.send("evm_mine", []);

      const initialBalP2 = await usdt.balanceOf(player2.address);
      const initialBalFee = await usdt.balanceOf(platformFee.address);

      const expectedPrize = ethers.parseUnits("19", 6);
      const expectedFee = ethers.parseUnits("1", 6);

      await expect(arena.finalizeWordDuel(1))
        .to.emit(arena, "WordDuelFinalized")
        .withArgs(1, player2.address, expectedPrize);

      expect(await usdt.balanceOf(player2.address) - initialBalP2).to.equal(expectedPrize);
      expect(await usdt.balanceOf(platformFee.address) - initialBalFee).to.equal(expectedFee);

      const round = await arena.wordDuelRounds(1);
      expect(round.finalized).to.be.true;
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
    it("should allow backend to send daily rewards from contract funds", async function () {
      const rewardAmount = ethers.parseUnits("1.5", 6);
      
      await usdt.connect(player1).transfer(await arena.getAddress(), ethers.parseUnits("10", 6));
      
      const initialBal = await usdt.balanceOf(player2.address);
      
      await expect(arena.connect(backendSigner).sendDailyReward(await usdt.getAddress(), player2.address, rewardAmount))
        .to.emit(arena, "DailyRewardSent")
        .withArgs(await usdt.getAddress(), player2.address, rewardAmount);
        
      const finalBal = await usdt.balanceOf(player2.address);
      expect(finalBal - initialBal).to.equal(rewardAmount);
    });

    it("should reject daily rewards sent by non-backend", async function () {
      const rewardAmount = ethers.parseUnits("1.5", 6);
      await expect(
        arena.connect(player1).sendDailyReward(await usdt.getAddress(), player2.address, rewardAmount)
      ).to.be.revertedWith("NimArena: only backend can send daily reward");
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

  describe("NIM Token Word Duel Verification", function () {
    it("should allow hosting, playing, and winning a round in NIM", async function () {
      const entryFee = ethers.parseUnits("50", 18); // 50 NIM
      await arena.connect(owner).createWordDuelRound(await nim.getAddress(), entryFee, 60);

      await arena.connect(player1).enterWordDuel(1);
      
      const score = 150;
      const sig = await signWordDuelResult(1, player1.address, score);
      await arena.connect(player1).submitWordDuelScore(1, score, sig);

      await ethers.provider.send("evm_increaseTime", [70]);
      await ethers.provider.send("evm_mine", []);

      const initialBalP1 = await nim.balanceOf(player1.address);
      const initialBalFee = await nim.balanceOf(platformFee.address);

      // Pot = 50 NIM. 5% fee = 2.5 NIM. Prize = 47.5 NIM.
      const expectedPrize = ethers.parseUnits("47.5", 18);
      const expectedFee = ethers.parseUnits("2.5", 18);

      await expect(arena.finalizeWordDuel(1))
        .to.emit(arena, "WordDuelFinalized")
        .withArgs(1, player1.address, expectedPrize);

      expect(await nim.balanceOf(player1.address) - initialBalP1).to.equal(expectedPrize);
      expect(await nim.balanceOf(platformFee.address) - initialBalFee).to.equal(expectedFee);
    });
  });
});
