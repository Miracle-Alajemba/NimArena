export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIdx: number;
  category: string;
}

const FALLBACK_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    question: "What is the native token of the Nimiq blockchain ecosystem?",
    options: ["NIM", "ETH", "SOL", "USDT"],
    correctIdx: 0,
    category: "Blockchain",
  },
  {
    id: 2,
    question: "Which EVM Layer-2 network is NimArena deployed on?",
    options: ["Arbitrum", "Base", "Optimism", "Polygon"],
    correctIdx: 1,
    category: "Blockchain",
  },
  {
    id: 3,
    question: "What is Nimiq's consensus algorithm after the Albatross upgrade?",
    options: ["Proof of Work", "Proof of Stake", "Proof of History", "Proof of Authority"],
    correctIdx: 1,
    category: "Blockchain",
  },
  {
    id: 4,
    question: "What is the average transaction finality time on Nimiq Proof of Stake?",
    options: ["10 seconds", "1 second", "1 minute", "15 minutes"],
    correctIdx: 1,
    category: "Tech",
  },
  {
    id: 5,
    question: "Which HTML tag is used to embed JavaScript logic into a web page?",
    options: ["<js>", "<script>", "<code >", "<logic>"],
    correctIdx: 1,
    category: "Web Dev",
  },
  {
    id: 6,
    question: "What is the total maximum supply cap of Bitcoin?",
    options: ["100 Million", "21 Million", "1 Billion", "Infinite"],
    correctIdx: 1,
    category: "Crypto",
  },
  {
    id: 7,
    question: "What does ERC-20 stand for in Ethereum standards?",
    options: ["Ethereum Request for Comments #20", "Ethereum Resource Code", "Encrypted Real Coin", "Extended Standard 20"],
    correctIdx: 0,
    category: "Web3",
  },
  {
    id: 8,
    question: "Which HTTP status code signifies 'Not Found'?",
    options: ["200", "500", "404", "403"],
    correctIdx: 2,
    category: "Tech",
  },
  {
    id: 9,
    question: "What does 'EIP' stand for in Web3 standards?",
    options: ["Ethereum Improvement Proposal", "External Protocol Code", "Easy Integration Path", "Essential Peer Protocol"],
    correctIdx: 0,
    category: "Web3",
  },
  {
    id: 10,
    question: "Which cryptographic function family powers SHA-256?",
    options: ["Secure Hash Algorithm 2", "MD5", "Keccak", "RSA"],
    correctIdx: 0,
    category: "Security",
  },
];

function decodeHTML(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

export async function fetchTriviaQuestions(amount = 10): Promise<TriviaQuestion[]> {
  try {
    const res = await fetch(`https://opentdb.com/api.php?amount=${amount}&type=multiple`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.response_code === 0 && Array.isArray(data.results) && data.results.length > 0) {
      return data.results.map((q: any, idx: number) => {
        const decodedQuestion = decodeHTML(q.question);
        const incorrect = q.incorrect_answers.map(decodeHTML);
        const correct = decodeHTML(q.correct_answer);

        // Shuffle options deterministically for smooth UI rendering
        const options = [...incorrect];
        const insertIdx = Math.floor(Math.random() * 4);
        options.splice(insertIdx, 0, correct);

        return {
          id: idx + 1,
          question: decodedQuestion,
          options,
          correctIdx: insertIdx,
          category: decodeHTML(q.category),
        };
      });
    }
  } catch (e) {
    console.warn("TriviaQuestions: Open Trivia DB fetch failed. Using fallback questions.", e);
  }

  return FALLBACK_QUESTIONS;
}
