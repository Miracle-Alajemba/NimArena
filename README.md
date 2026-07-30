# 🏟️ NimArena

NimArena is a competitive, skill-based mini-game hub built for Nimiq Pay. Operating as a decentralized web application within the Nimiq Pay ecosystem, all matches, scores, and rewards are settled transparently on-chain via Solidity smart contracts on Base.

This is a personal project developed by **Miracle Alajemba**.

---

## 🌟 Core Features & Live Games

NimArena features 3 live skill-based Web3 games with instant practice modes, daily challenges, and on-chain wagers settled in **USDT** or **NIM**:

### 🏺 Word Pot (Multiplayer & Practice)
* **Shared Source Word Mechanic**: Every player in a round competes on equal footing using the exact same 8–12 letter source word.
* **Letter Exhaustion & Visuals**: Renders letter tiles in bold **Syne Bold** typography, dynamically greying out used letters as words are formed.
* **60-Second Blitz**: Race the clock to find as many valid English sub-words as possible within the 60-second limit.
* **ECDSA Signed Proofs & On-Chain Payouts**: Backend signs cryptographic score proofs verified on-chain to distribute prize pools.
* **Practice & Daily Modes**: Free solo practice arena and 24-hour daily challenges.

### ⚔️ Word Duel (Multiplayer)
* **Skill-Based Word Building**: Test your vocabulary in real-time head-to-head matches against opponents.
* **Wager Options**: Stake standard wagers (`0.5`, `1.0`, or `2.0` in USDT or NIM) to join live rounds.
* **Practice Arena**: Free solo practice mode to sharpen your word skills without entry fees.

### 🧠 Speed Trivia (Tournament Mode)
* **Rapid Gameplay**: Answer 10 timed trivia questions testing general knowledge, science, and Web3 trivia.
* **Speed & Accuracy Scoring**: Higher speed bonuses awarded for faster correct answers.
* **Practice Mode**: Instant practice mode with built-in fallback questions.

---

## 🏗️ Project Architecture

This project is configured as a clean monorepo:

```
NimArena/
├── contracts/       # Solidity smart contracts & Hardhat test suite (22/22 passing)
├── backend/         # Express API, Prisma ORM, ECDSA Signer & Event Syncer
└── frontend/        # React 18, Vite, Tailwind CSS & Nimiq Pay SDK
```

---

## 🚀 Quick Start & Submission Setup

### 1. Smart Contracts & Tests
```bash
cd contracts
npm install
npx hardhat test
```

### 2. Backend Service
```bash
cd backend
npm install
npm run build
npm run dev
```

### 3. Frontend Web App
```bash
cd frontend
npm install
npm run build
npm run dev
```

Open **`http://localhost:5173/`** to launch the NimArena Game Hub.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Miracle Alajemba.
