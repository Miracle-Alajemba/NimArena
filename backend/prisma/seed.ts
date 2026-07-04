import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const questions = [
  // Crypto/Blockchain (15 questions)
  {
    question: "Who is credited with creating Bitcoin?",
    optionA: "Vitalik Buterin",
    optionB: "Satoshi Nakamoto",
    optionC: "Charlie Lee",
    optionD: "Hal Finney",
    correctIdx: 1,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "What consensus mechanism does Ethereum currently use?",
    optionA: "Proof of Work",
    optionB: "Proof of Stake",
    optionC: "Proof of History",
    optionD: "Proof of Authority",
    correctIdx: 1,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "Which EVM-compatible Layer 2 network is backed by Coinbase?",
    optionA: "Arbitrum",
    optionB: "Optimism",
    optionC: "Base",
    optionD: "Polygon",
    correctIdx: 2,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "What is the maximum supply of Bitcoin?",
    optionA: "21 Million",
    optionB: "100 Million",
    optionC: "18 Million",
    optionD: "Unlimited",
    correctIdx: 0,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "What standard is commonly used for ERC-20 tokens?",
    optionA: "Fungible Tokens",
    optionB: "Non-Fungible Tokens",
    optionC: "Semi-Fungible Tokens",
    optionD: "SBTs",
    correctIdx: 0,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "Which Ethereum Upgrade transitioned the network to Proof of Stake?",
    optionA: "London",
    optionB: "Shanghai",
    optionC: "The Merge",
    optionD: "Dencun",
    correctIdx: 2,
    category: "Crypto",
    difficulty: "medium"
  },
  {
    question: "What does IPFS stand for?",
    optionA: "InterPlanetary File System",
    optionB: "Internet Protocol File Sharing",
    optionC: "Internal Packet Forwarding Service",
    optionD: "Interconnected Peer File Storage",
    correctIdx: 0,
    category: "Crypto",
    difficulty: "medium"
  },
  {
    question: "What are the first 8 bytes of a Solidity function selector derived from?",
    optionA: "abi.encode",
    optionB: "keccak256 hash of signature",
    optionC: "Sha256 of signature",
    optionD: "First 4 bytes of keccak256 hash",
    correctIdx: 3,
    category: "Crypto",
    difficulty: "hard"
  },
  {
    question: "In cryptography, what does ECDSA stand for?",
    optionA: "Elliptic Curve Digital Signature Algorithm",
    optionB: "Encryption Cipher Data Security Association",
    optionC: "Encoded Cryptographic Digital Signature Authority",
    optionD: "External Cipher Decryption Security Architecture",
    correctIdx: 0,
    category: "Crypto",
    difficulty: "medium"
  },
  {
    question: "Which EIP introduced the EIP-1193 Ethereum Provider Standard?",
    optionA: "EIP-20",
    optionB: "EIP-712",
    optionC: "EIP-1193",
    optionD: "EIP-1559",
    correctIdx: 2,
    category: "Crypto",
    difficulty: "hard"
  },
  {
    question: "Which EVM instruction was introduced in Cancun to copy memory?",
    optionA: "MSTORE",
    optionB: "MCOPY",
    optionC: "MLOAD",
    optionD: "MSIZE",
    correctIdx: 1,
    category: "Crypto",
    difficulty: "hard"
  },
  {
    question: "What is the primary token used inside the Nimiq Ecosystem?",
    optionA: "NIM",
    optionB: "USDT",
    optionC: "BTC",
    optionD: "ETH",
    correctIdx: 0,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "In what year was the Bitcoin whitepaper published?",
    optionA: "2007",
    optionB: "2008",
    optionC: "2009",
    optionD: "2010",
    correctIdx: 1,
    category: "Crypto",
    difficulty: "medium"
  },
  {
    question: "Which hashing algorithm is used by Bitcoin mining?",
    optionA: "Ethash",
    optionB: "Scrypt",
    optionC: "SHA-256",
    optionD: "Keccak-256",
    correctIdx: 2,
    category: "Crypto",
    difficulty: "easy"
  },
  {
    question: "What is gas in Ethereum?",
    optionA: "A governance token",
    optionB: "Transaction execution fee unit",
    optionC: "A Layer 2 rollup protocol",
    optionD: "Liquidity provider reward",
    correctIdx: 1,
    category: "Crypto",
    difficulty: "easy"
  },

  // Technology (15 questions)
  {
    question: "Which language is known as the language of the web?",
    optionA: "Python",
    optionB: "C++",
    optionC: "JavaScript",
    optionD: "Ruby",
    correctIdx: 2,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "What does HTML stand for?",
    optionA: "Hyper Text Markup Language",
    optionB: "Home Tool Markup Language",
    optionC: "Hyperlink and Text Management Language",
    optionD: "Hyper Transfer Markdown Language",
    correctIdx: 0,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "Which database type uses tables, rows, and columns?",
    optionA: "NoSQL",
    optionB: "Relational (SQL)",
    optionC: "Graph",
    optionD: "Key-Value",
    correctIdx: 1,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "What does CSS stand for?",
    optionA: "Computer Style Sheets",
    optionB: "Cascading Style Sheets",
    optionC: "Creative Style System",
    optionD: "Colorful Style Sheets",
    correctIdx: 1,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "Who co-founded Microsoft alongside Bill Gates?",
    optionA: "Steve Jobs",
    optionB: "Paul Allen",
    optionC: "Steve Ballmer",
    optionD: "Larry Page",
    correctIdx: 1,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "What is the name of the package manager bundled with Node.js?",
    optionA: "yarn",
    optionB: "pnpm",
    optionC: "npm",
    optionD: "pip",
    correctIdx: 2,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "Which company developed the React library?",
    optionA: "Google",
    optionB: "Meta (Facebook)",
    optionC: "Microsoft",
    optionD: "Vercel",
    correctIdx: 1,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "What is the time complexity of searching a sorted array using Binary Search?",
    optionA: "O(1)",
    optionB: "O(n)",
    optionC: "O(n log n)",
    optionD: "O(log n)",
    correctIdx: 3,
    category: "Tech",
    difficulty: "medium"
  },
  {
    question: "Which HTTP status code represents 'Internal Server Error'?",
    optionA: "400",
    optionB: "404",
    optionC: "500",
    optionD: "502",
    correctIdx: 2,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "In git, how do you download changes and merge them immediately?",
    optionA: "git fetch",
    optionB: "git pull",
    optionC: "git commit",
    optionD: "git push",
    correctIdx: 1,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "What does DNS stand for?",
    optionA: "Domain Name System",
    optionB: "Dynamic Network Service",
    optionC: "Data Name Server",
    optionD: "Distributed Node System",
    correctIdx: 0,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "Which programming language is designed to run natively in the browser alongside JS?",
    optionA: "Rust",
    optionB: "WebAssembly (Wasm)",
    optionC: "TypeScript",
    optionD: "Dart",
    correctIdx: 1,
    category: "Tech",
    difficulty: "medium"
  },
  {
    question: "What type of attack floods a network with traffic to take it offline?",
    optionA: "Phishing",
    optionB: "DDoS",
    optionC: "SQL Injection",
    optionD: "Man-in-the-Middle",
    correctIdx: 1,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "What is the default port for HTTP traffic?",
    optionA: "80",
    optionB: "443",
    optionC: "8080",
    optionD: "3000",
    correctIdx: 0,
    category: "Tech",
    difficulty: "easy"
  },
  {
    question: "Which compiler translates TypeScript into plain JavaScript?",
    optionA: "Vite",
    optionB: "Babel",
    optionC: "tsc",
    optionD: "esbuild",
    correctIdx: 2,
    category: "Tech",
    difficulty: "medium"
  },

  // General Knowledge / Science (22 questions)
  {
    question: "What is the closest planet to the Sun?",
    optionA: "Venus",
    optionB: "Mars",
    optionC: "Mercury",
    optionD: "Earth",
    correctIdx: 2,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "What is the chemical symbol for Gold?",
    optionA: "Go",
    optionB: "Gd",
    optionC: "Au",
    optionD: "Ag",
    correctIdx: 2,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "Which organ is responsible for pumping blood throughout the human body?",
    optionA: "Brain",
    optionB: "Lungs",
    optionC: "Liver",
    optionD: "Heart",
    correctIdx: 3,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "What is the speed of light in a vacuum?",
    optionA: "Approx. 300,000 km/s",
    optionB: "Approx. 150,000 km/s",
    optionC: "Approx. 500,000 km/s",
    optionD: "Approx. 1,000,000 km/s",
    correctIdx: 0,
    category: "Science",
    difficulty: "medium"
  },
  {
    question: "What is the largest ocean on Earth?",
    optionA: "Atlantic Ocean",
    optionB: "Indian Ocean",
    optionC: "Pacific Ocean",
    optionD: "Arctic Ocean",
    correctIdx: 2,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "Which country has the largest population in the world?",
    optionA: "China",
    optionB: "United States",
    optionC: "India",
    optionD: "Indonesia",
    correctIdx: 2,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "Who wrote the play 'Romeo and Juliet'?",
    optionA: "Charles Dickens",
    optionB: "William Shakespeare",
    optionC: "Jane Austen",
    optionD: "Mark Twain",
    correctIdx: 1,
    category: "History",
    difficulty: "easy"
  },
  {
    question: "What is the capital of Japan?",
    optionA: "Kyoto",
    optionB: "Osaka",
    optionC: "Tokyo",
    optionD: "Hiroshima",
    correctIdx: 2,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "How many bones are there in an adult human body?",
    optionA: "186",
    optionB: "206",
    optionC: "226",
    optionD: "256",
    correctIdx: 1,
    category: "Science",
    difficulty: "medium"
  },
  {
    question: "What is the hardest natural substance on Earth?",
    optionA: "Gold",
    optionB: "Iron",
    optionC: "Diamond",
    optionD: "Quartz",
    correctIdx: 2,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "Which gas do plants absorb from the atmosphere for photosynthesis?",
    optionA: "Oxygen",
    optionB: "Carbon Dioxide",
    optionC: "Nitrogen",
    optionD: "Hydrogen",
    correctIdx: 1,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "In what year did World War II end?",
    optionA: "1943",
    optionB: "1944",
    optionC: "1945",
    optionD: "1946",
    correctIdx: 2,
    category: "History",
    difficulty: "easy"
  },
  {
    question: "Who painted the famous Mona Lisa?",
    optionA: "Vincent van Gogh",
    optionB: "Pablo Picasso",
    optionC: "Leonardo da Vinci",
    optionD: "Claude Monet",
    correctIdx: 2,
    category: "History",
    difficulty: "easy"
  },
  {
    question: "What is the chemical formula for water?",
    optionA: "CO2",
    optionB: "H2O",
    optionC: "NaCl",
    optionD: "O2",
    correctIdx: 1,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "Which country is home to the Great Barrier Reef?",
    optionA: "Brazil",
    optionB: "Australia",
    optionC: "South Africa",
    optionD: "New Zealand",
    correctIdx: 1,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "What is the capital of France?",
    optionA: "Berlin",
    optionB: "Rome",
    optionC: "London",
    optionD: "Paris",
    correctIdx: 3,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "What is the main gas found in the air we breathe?",
    optionA: "Oxygen",
    optionB: "Carbon Dioxide",
    optionC: "Nitrogen",
    optionD: "Argon",
    correctIdx: 2,
    category: "Science",
    difficulty: "medium"
  },
  {
    question: "Who is known as the father of modern physics?",
    optionA: "Isaac Newton",
    optionB: "Galileo Galilei",
    optionC: "Albert Einstein",
    optionD: "Nikola Tesla",
    correctIdx: 2,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "Which continent is the Sahara Desert located on?",
    optionA: "Asia",
    optionB: "Africa",
    optionC: "Australia",
    optionD: "South America",
    correctIdx: 1,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "How many colors are there in a rainbow?",
    optionA: "6",
    optionB: "7",
    optionC: "8",
    optionD: "9",
    correctIdx: 1,
    category: "Science",
    difficulty: "easy"
  },
  {
    question: "What is the smallest country in the world?",
    optionA: "Monaco",
    optionB: "Vatican City",
    optionC: "San Marino",
    optionD: "Liechtenstein",
    correctIdx: 1,
    category: "Geography",
    difficulty: "easy"
  },
  {
    question: "What temperature does water boil at in Celsius?",
    optionA: "90",
    optionB: "100",
    optionC: "120",
    optionD: "200",
    correctIdx: 1,
    category: "Science",
    difficulty: "easy"
  }
];

async function main() {
  console.log("Seeding trivia questions...");
  await prisma.triviaQuestion.deleteMany({});
  
  for (const q of questions) {
    await prisma.triviaQuestion.create({ data: q });
  }

  console.log(`Successfully seeded ${questions.length} questions!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
