# NimArena — Nimiq Mini App Hackathon Demo Guide

Welcome to **NimArena**! This document provides instructions for judges evaluating NimArena for the Nimiq Mini Apps Competition.

---

## 🎮 What is NimArena?

NimArena is a competitive skill-gaming hub built with the **Nimiq Mini Apps Framework**, designed to run natively inside the **Nimiq Pay WebView**. Players compete in skill-based games with wagers in **NIM** and **USDT** (on Base L2).

### Playable Games:
1. **Speed Trivia**: 10 questions with 10s per question timers and speed bonuses powered by Open Trivia DB.
2. **Word Pot**: 60-second multiplayer arena where all players share the exact same 7 letter tiles.
3. **Word Duel**: 1v1 anagram speed duel with 60-second timers and rare letter multipliers (J, K, Q, X, Z).

---

## ⚡ Nimiq Ecosystem Advantages Demonstrated

- **Nimiq Pay Mini App SDK Integration**: Instant device identification (`requestDeviceIdentifier`) and native injected Web3 wallet support.
- **⚡ 1-Second Finality**: Albatross PoS consensus enables near-instant round resolution.
- **🪙 Feeless Micro-Wagers**: High-velocity competitive gameplay without gas friction.
- **🌐 Browser-First**: Playable directly inside Nimiq Pay WebViews or any Web3 browser.

---

## 🚀 How to Run & Test Locally

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Open in browser
# http://localhost:5173
```

---

## 📊 Marketing & Distribution Features

- **Referral System**: Generates unique referral codes per wallet address, tracks commissions, and simulates a 10% entry fee referral reward.
- **Social Sharing**: Direct single-click sharing of game scores to **X (Twitter)** and **Farcaster**.
- **Offline High Scores**: Instant high score tracking via `localStorage`.
