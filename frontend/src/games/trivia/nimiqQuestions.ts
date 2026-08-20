export interface NimiqTriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIdx: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

export const NIMIQ_QUESTIONS: NimiqTriviaQuestion[] = [
  // --- Category 1: Nimiq Basics (1-15) ---
  {
    id: 1,
    question: "What is Nimiq?",
    options: [
      "A browser-based blockchain for simple, self-custodial payments",
      "A mobile-only crypto exchange",
      "A hardware wallet manufacturer",
      "A centralized payment processor"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 2,
    question: "When was Nimiq founded?",
    options: ["2017", "2015", "2018", "2019"],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 3,
    question: "What makes Nimiq unique among blockchains?",
    options: [
      "It's browser-first and requires no downloads",
      "It uses Proof-of-Work mining",
      "It requires software installation",
      "It only works on desktop"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 4,
    question: "What is Nimiq's core mission?",
    options: [
      "Simple, frictionless, self-custodial payments accessible to everyone",
      "To create the fastest blockchain",
      "To compete with Bitcoin",
      "To become a centralized exchange"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 5,
    question: "What is the Nimiq mainnet launch date?",
    options: ["Q2 2018", "Q1 2017", "Q3 2019", "Q4 2020"],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "medium"
  },
  {
    id: 6,
    question: "Who founded Nimiq?",
    options: [
      "Elion Chin and Philipp von Styp-Rekowsky",
      "Vitalik Buterin and Gavin Wood",
      "Charlie Lee and Billy Markus",
      "Satoshi Nakamoto"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "medium"
  },
  {
    id: 7,
    question: "What problem does Nimiq solve?",
    options: [
      "Making crypto payments as easy as using a web browser",
      "Creating the fastest mining algorithm",
      "Building a new exchange",
      "Making hardware wallets"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 8,
    question: "What is Nimiq's approach to user onboarding?",
    options: [
      "Anyone can join directly from a browser without installing software",
      "Users must download a mobile app",
      "Users need to buy hardware",
      "Users must verify identity"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 9,
    question: "Is Nimiq custodial or non-custodial?",
    options: [
      "Non-custodial - users control their private keys",
      "Custodial - Nimiq holds user funds",
      "Both custodial and non-custodial",
      "Depends on user preference"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 10,
    question: "What devices can access Nimiq?",
    options: [
      "Any device with an up-to-date web browser",
      "Only desktop computers",
      "Only mobile phones",
      "Only hardware wallets"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 11,
    question: "What is the Nimiq community known for?",
    options: [
      "An active, engaged community of builders and users",
      "A small inactive community",
      "Only developers",
      "Only investors"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "medium"
  },
  {
    id: 12,
    question: "What is Nimiq's stance on accessibility?",
    options: [
      "Financial inclusion through browser-native accessibility",
      "Premium service for wealthy users",
      "Only for technical users",
      "Region-restricted"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },
  {
    id: 13,
    question: "What does 'browser-native' mean for Nimiq?",
    options: [
      "Built to work directly in web browsers without plugins",
      "Requires Chrome extension",
      "Only works in Firefox",
      "Needs WebAssembly"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "medium"
  },
  {
    id: 14,
    question: "What is Nimiq's relationship to the web?",
    options: [
      "Nimiq is natively built for the web ecosystem",
      "Nimiq competes with the web",
      "Nimiq replaces the web",
      "Nimiq is a web plugin"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "medium"
  },
  {
    id: 15,
    question: "How does Nimiq ensure user privacy?",
    options: [
      "No registration, no KYC, users control their data",
      "Full KYC required",
      "Users must register with email",
      "Nimiq collects user data"
    ],
    correctIdx: 0,
    category: "Nimiq Basics",
    difficulty: "easy"
  },

  // --- Category 2: NIM Token (16-30) ---
  {
    id: 16,
    question: "What is NIM's ticker symbol?",
    options: ["NIM", "NIQ", "NMQ", "NMT"],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 17,
    question: "What is the maximum supply of NIM?",
    options: ["21 billion", "21 million", "100 billion", "10 million"],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 18,
    question: "What is the current circulating supply?",
    options: [
      "Approximately 14.6 billion NIM",
      "5 billion",
      "21 billion",
      "10 billion"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "medium"
  },
  {
    id: 19,
    question: "What is NIM used for?",
    options: [
      "Payments, staking, and network security",
      "Only for trading",
      "Only for mining rewards",
      "Only for governance"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 20,
    question: "What blockchain is NIM native to?",
    options: [
      "The Nimiq blockchain",
      "Ethereum",
      "Binance Smart Chain",
      "Solana"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 21,
    question: "What is the smallest unit of NIM called?",
    options: [
      "Luna (1 NIM = 100,000 luna)",
      "Satoshi",
      "Wei",
      "Gwei"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "hard"
  },
  {
    id: 22,
    question: "What wallets support NIM?",
    options: [
      "Nimiq Wallet, Trust Wallet, Ledger",
      "Only Nimiq Wallet",
      "Only MetaMask",
      "Only Coinbase"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 23,
    question: "Is NIM an ERC-20 token?",
    options: [
      "No, it's native to the Nimiq blockchain",
      "Yes, it's an ERC-20 token",
      "Yes, on Ethereum",
      "No, it's BEP-20"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "medium"
  },
  {
    id: 24,
    question: "What happens to NIM rewards from staking?",
    options: [
      "Validators earn NIM rewards for securing the network",
      "Rewards are burned",
      "Rewards go to the foundation",
      "No rewards are given"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "medium"
  },
  {
    id: 25,
    question: "Can NIM be used for micropayments?",
    options: [
      "Yes, NIM has low fees and fast transactions",
      "No, fees are too high",
      "Only for large transactions",
      "Not recommended"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 26,
    question: "How fast are NIM transactions?",
    options: [
      "~1 second finality with Albatross",
      "10 minutes",
      "1 hour",
      "5 seconds"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 27,
    question: "How much does a NIM transaction cost?",
    options: [
      "Essentially feeless (fractions of a cent)",
      "$1-5 per transaction",
      "1% of transaction value",
      "Gas fees like Ethereum"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },
  {
    id: 28,
    question: "What is NIM's market cap rank?",
    options: ["Around #1000 (varies)", "Top 10", "Top 100", "Top 500"],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "medium"
  },
  {
    id: 29,
    question: "What is the NIM inflation rate?",
    options: [
      "Decreasing over time based on staking participation",
      "Fixed at 5% annually",
      "No inflation",
      "High inflation"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "hard"
  },
  {
    id: 30,
    question: "Where can NIM be traded?",
    options: [
      "On decentralized exchanges and partnered platforms like Coinify",
      "Only on Binance",
      "Only on Coinbase",
      "Not traded anywhere"
    ],
    correctIdx: 0,
    category: "NIM Token",
    difficulty: "easy"
  },

  // --- Category 3: Nimiq Wallet (31-45) ---
  {
    id: 31,
    question: "What is special about Nimiq Wallet?",
    options: [
      "Self-custodial, browser-based, no downloads required",
      "Requires software installation",
      "Centralized",
      "Only for desktop"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 32,
    question: "What tokens does Nimiq Wallet support?",
    options: ["NIM, BTC, USDC", "Only NIM", "NIM and ETH", "Only stablecoins"],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 33,
    question: "What are Cashlinks?",
    options: [
      "Feature to send crypto via simple links, like sending a message",
      "A hardware wallet",
      "A mining tool",
      "A type of token"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "medium"
  },
  {
    id: 34,
    question: "How does Nimiq Wallet handle security?",
    options: [
      "Private key ownership, Ledger integration, login files",
      "Centralized servers store keys",
      "2FA only",
      "SMS verification"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "medium"
  },
  {
    id: 35,
    question: "What is the Nimiq Pay mobile app?",
    options: [
      "Mobile wallet for crypto payments supporting Bitcoin Lightning",
      "A centralized exchange app",
      "A mining app",
      "A social media app"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "medium"
  },
  {
    id: 36,
    question: "How do you back up a Nimiq Wallet?",
    options: [
      "Using a 24-word recovery phrase or login file",
      "Only via email backup",
      "No backup option",
      "Requires KYC"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 37,
    question: "What is the wallet address format?",
    options: [
      "NQ... (Nimiq address format)",
      "0x...",
      "bc1...",
      "1..."
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 38,
    question: "How long does it take to create a Nimiq wallet?",
    options: [
      "Seconds - just open the browser and create one",
      "Hours",
      "Days",
      "Requires approval"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 39,
    question: "Can you use Nimiq Wallet with hardware wallets?",
    options: [
      "Yes, supports Ledger Nano S",
      "No hardware support",
      "Only Trezor",
      "Only KeepKey"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "medium"
  },
  {
    id: 40,
    question: "What is a login file?",
    options: [
      "An encrypted file used to access your Nimiq wallet",
      "A type of cryptocurrency",
      "A mining tool",
      "A smart contract"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "medium"
  },
  {
    id: 41,
    question: "Is Nimiq Wallet open source?",
    options: [
      "Yes, the code is available on GitHub",
      "No, it's closed source",
      "Only partially open",
      "No public access"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 42,
    question: "What happens if you lose your recovery phrase?",
    options: [
      "You permanently lose access to your wallet",
      "Nimiq can recover it",
      "You can reset with email",
      "Contact support"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 43,
    question: "How many accounts can you have in Nimiq Wallet?",
    options: [
      "Multiple accounts can be created and managed",
      "Only one account",
      "Maximum 3 accounts",
      "Accounts are limited"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "medium"
  },
  {
    id: 44,
    question: "What is the wallet's transaction history?",
    options: [
      "Fully viewable on the blockchain explorer",
      "Only available in-app",
      "Hidden from users",
      "Deleted after 30 days"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "easy"
  },
  {
    id: 45,
    question: "Does Nimiq Wallet support multi-signature?",
    options: [
      "Yes, supports multi-signature transactions",
      "No multi-sig support",
      "Only for enterprise",
      "Limited support"
    ],
    correctIdx: 0,
    category: "Nimiq Wallet",
    difficulty: "hard"
  },

  // --- Category 4: Albatross & Nimiq 2.0 (46-55) ---
  {
    id: 46,
    question: "What is Albatross?",
    options: [
      "Nimiq's Proof-of-Stake consensus algorithm",
      "A Proof-of-Work mining algorithm",
      "A hardware device",
      "A token name"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "easy"
  },
  {
    id: 47,
    question: "What is Nimiq 2.0?",
    options: [
      "The migration from Proof-of-Work to Proof-of-Stake",
      "A new exchange",
      "A mobile app update",
      "A hard fork"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "easy"
  },
  {
    id: 48,
    question: "What are the benefits of Albatross?",
    options: [
      "1000+ TPS, 1-second block time, energy efficient, secure",
      "100 TPS, 10-second block time",
      "High energy usage",
      "Only for mining"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "medium"
  },
  {
    id: 49,
    question: "What is the role of validators?",
    options: [
      "Produce blocks, validate transactions, secure the network",
      "Only mine tokens",
      "Only trade tokens",
      "Only govern"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "easy"
  },
  {
    id: 50,
    question: "How many validators does Nimiq have?",
    options: [
      "Up to 100 active validators",
      "10 validators",
      "Unlimited validators",
      "1000 validators"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "hard"
  },
  {
    id: 51,
    question: "What is Proof-of-Stake vs Proof-of-Work?",
    options: [
      "PoS uses staked tokens to validate, PoW uses computational power",
      "PoS uses mining, PoW uses staking",
      "They are the same",
      "PoS is older"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "medium"
  },
  {
    id: 52,
    question: "What is the block time under Albatross?",
    options: ["1 second", "10 seconds", "1 minute", "10 minutes"],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "easy"
  },
  {
    id: 53,
    question: "What is the transactions per second (TPS) of Albatross?",
    options: ["Over 1000 TPS", "10 TPS", "100 TPS", "5000 TPS"],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "hard"
  },
  {
    id: 54,
    question: "What happens during the Nimiq 2.0 migration?",
    options: [
      "NIM tokens are swapped from PoW chain to new PoS chain",
      "NIM tokens are burned",
      "All tokens are replaced",
      "Users lose funds"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "medium"
  },
  {
    id: 55,
    question: "How does Albatross achieve finality?",
    options: [
      "Through instant finality with 1-second block times",
      "After 10 confirmations",
      "After 1 hour",
      "No finality"
    ],
    correctIdx: 0,
    category: "Albatross & Nimiq 2.0",
    difficulty: "medium"
  },

  // --- Category 5: Nimiq Ecosystem Apps (56-65) ---
  {
    id: 56,
    question: "What is Nimiq Pay?",
    options: [
      "Mobile app for real-world crypto payments, supports Bitcoin Lightning",
      "A desktop wallet",
      "A mining pool",
      "An exchange"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "easy"
  },
  {
    id: 57,
    question: "What is Cryptopayment.link?",
    options: [
      "Decentralized payment solution for merchants, 100% peer-to-peer",
      "A centralized payment processor",
      "A token swap service",
      "A hardware wallet"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "medium"
  },
  {
    id: 58,
    question: "What is SuperSimpleSwap?",
    options: [
      "Self-custodial fiat-to-crypto exchange, no registration needed",
      "A decentralized exchange for tokens",
      "A centralized exchange",
      "A wallet"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "easy"
  },
  {
    id: 59,
    question: "What is Crypto Map?",
    options: [
      "A global directory to find crypto-friendly businesses",
      "A map of crypto exchanges",
      "A mining location map",
      "A wallet finder"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "medium"
  },
  {
    id: 60,
    question: "What is Nimiq Hub?",
    options: [
      "The official developer platform for Nimiq applications",
      "A social network",
      "A gaming platform",
      "A token launchpad"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "medium"
  },
  {
    id: 61,
    question: "What is the Nimiq Mini Apps Framework?",
    options: [
      "A toolkit for building applications that integrate with Nimiq Pay",
      "A mobile app",
      "A wallet",
      "A blockchain explorer"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "hard"
  },
  {
    id: 62,
    question: "What is the Nimiq Developer Center?",
    options: [
      "The official documentation and resource hub for developers",
      "A coding bootcamp",
      "A community forum",
      "A token sale"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "easy"
  },
  {
    id: 63,
    question: "How can merchants accept NIM payments?",
    options: [
      "Through Cashlinks, Cryptopayment.link, or direct integration",
      "Only through exchanges",
      "Only through payment processors",
      "No merchant support"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "easy"
  },
  {
    id: 64,
    question: "What is the Nimiq Playground?",
    options: [
      "An online IDE for building and testing Nimiq applications",
      "A gaming platform",
      "A social media app",
      "A wallet"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "hard"
  },
  {
    id: 65,
    question: "What is Nimiq's approach to DeFi?",
    options: [
      "Building accessible, simple DeFi tools integrated with the ecosystem",
      "No DeFi plans",
      "Competing with Ethereum",
      "Only centralized finance"
    ],
    correctIdx: 0,
    category: "Nimiq Ecosystem Apps",
    difficulty: "medium"
  },

  // --- Category 6: Staking & Governance (66-75) ---
  {
    id: 66,
    question: "What is staking in Nimiq?",
    options: [
      "Delegating NIM to help secure the network and earn rewards",
      "Buying NIM tokens",
      "Trading NIM on exchanges",
      "Mining NIM"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "easy"
  },
  {
    id: 67,
    question: "How do validators earn rewards?",
    options: [
      "By producing blocks and validating transactions",
      "By trading tokens",
      "By referring users",
      "By developing apps"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "easy"
  },
  {
    id: 68,
    question: "What happens if a validator misbehaves?",
    options: [
      "Jail state, burned rewards, stake locked",
      "Fine paid in fiat",
      "Temporary ban",
      "Warning only"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "medium"
  },
  {
    id: 69,
    question: "How does community governance work?",
    options: [
      "NIM holders can participate in decision-making",
      "Only developers decide",
      "Foundation controls everything",
      "No community input"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "medium"
  },
  {
    id: 70,
    question: "What is the Community Funding Board?",
    options: [
      "6 member board managing community funds for ecosystem growth",
      "A central bank",
      "A token holder group",
      "A development team"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "hard"
  },
  {
    id: 71,
    question: "What is the reward rate for staking?",
    options: [
      "Approximately 10-15% APY depending on staking participation",
      "5% APY",
      "20% APY",
      "Fixed at 12%"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "medium"
  },
  {
    id: 72,
    question: "How long does it take to unstake NIM?",
    options: [
      "2 days (48 hours) unbonding period",
      "Instant",
      "7 days",
      "30 days"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "hard"
  },
  {
    id: 73,
    question: "What is delegation in Nimiq?",
    options: [
      "Assigning your stake to a validator to earn rewards",
      "Voting in governance",
      "Running a validator",
      "Buying tokens"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "medium"
  },
  {
    id: 74,
    question: "How is the stake distribution determined?",
    options: [
      "By the total NIM staked by each validator",
      "By validator's age",
      "By validator's location",
      "Randomly"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "hard"
  },
  {
    id: 75,
    question: "What happens to transaction fees in Nimiq 2.0?",
    options: [
      "Fees are burned, deflationary pressure on NIM",
      "Fees go to validators",
      "Fees go to foundation",
      "No fees collected"
    ],
    correctIdx: 0,
    category: "Staking & Governance",
    difficulty: "hard"
  }
];
