# 🏟️ NimArena

NimArena is a competitive, skill-based mini-game hub built for Nimiq Pay. Operating as a decentralized web application within the Nimiq Pay ecosystem, all matches, scores, and rewards are settled transparently on-chain via Solidity smart contracts on Base.

This is a personal project developed by **Miracle Alajemba**.

---

## 🌟 Core Features

### ⚔️ Word Duel (Multiplayer)
* **Play with Friends (Private Rooms)**: Host direct match wagers by sharing 6-digit numeric room codes, or enter your friend's code to join their custom arena.
* **Quick Matchmaking**: Stake standard wagers (`0.5`, `1.0`, or `2.0` in either NIM or USDT) and pair instantly with random online opponents.
* **Commit-Reveal Mechanism**: Players submit hashed words to prevent frontrunning. Once both words are revealed, the longer valid English word claims the pot.

### 🧠 Speed Trivia (Tournament Mode)
* **Competitive Rounds**: Enter live rounds by staking the required entry fee.
* **Rapid Gameplay**: Answer 10 consecutive timed trivia questions. Speed and accuracy determine your score.
* **ECDSA Signed Proofs**: Score validations are digitally signed by the backend key and submitted on-chain to verify outcomes and disburse the pool.

### 🧩 Daily Challenge (Single-Player)
* **Daily Anagram Solver**: Solve the daily puzzle by building valid anagram sub-words from a randomly picked 8-10 letter source word.
* **Score Milestones**: Achieve a score of `50 points` within the session limit to claim a daily reward.
* **Direct Payouts**: The daily reward of `1.00 USDT` or wrapping wagers is sent directly to your wallet on-chain.
* **24h Cooldown Cooldown**: Monitored via a rolling database timestamp and rendered as an interactive live countdown clock.

---

## 🏗️ Project Architecture

This project is configured as a monorepo using npm workspaces:

```
NimArena/
├── contracts/       # Solidity smart contracts & Hardhat test suite
├── backend/         # Express API, Socket.io matchmaker & event sync services
└── frontend/        # React, Vite, Tailwind CSS v4 & Nimiq Pay SDK
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Miracle Alajemba.
