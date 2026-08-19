export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIdx: number;
  category: string;
}

// Session used questions tracker to prevent duplicate questions
const usedQuestionTexts = new Set<string>();

// Open Trivia DB Categories (9 = General Knowledge, 17 = Science, 18 = Tech, 23 = History, etc.)
const OPENTDB_CATEGORIES = [
  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
];

// Comprehensive 100+ Question Fallback Bank across 10 categories
const FALLBACK_QUESTIONS: Omit<TriviaQuestion, "id">[] = [
  // --- Blockchain & Crypto (1-15) ---
  { question: "What is the native token of the Nimiq blockchain ecosystem?", options: ["NIM", "ETH", "SOL", "USDT"], correctIdx: 0, category: "Blockchain" },
  { question: "Which EVM Layer-2 network is NimArena deployed on?", options: ["Arbitrum", "Base", "Optimism", "Polygon"], correctIdx: 1, category: "Blockchain" },
  { question: "What is Nimiq's consensus algorithm after the Albatross upgrade?", options: ["Proof of Work", "Proof of Stake", "Proof of History", "Proof of Authority"], correctIdx: 1, category: "Blockchain" },
  { question: "What is the average transaction finality time on Nimiq Proof of Stake?", options: ["10 seconds", "1 second", "1 minute", "15 minutes"], correctIdx: 1, category: "Blockchain" },
  { question: "What is the total maximum supply cap of Bitcoin?", options: ["100 Million", "21 Million", "1 Billion", "Infinite"], correctIdx: 1, category: "Crypto" },
  { question: "What does ERC-20 stand for in Ethereum standards?", options: ["Ethereum Request for Comments #20", "Ethereum Resource Code", "Encrypted Real Coin", "Extended Standard 20"], correctIdx: 0, category: "Web3" },
  { question: "What does 'EIP' stand for in Web3 standards?", options: ["Ethereum Improvement Proposal", "External Protocol Code", "Easy Integration Path", "Essential Peer Protocol"], correctIdx: 0, category: "Web3" },
  { question: "Who is the pseudonymous creator of Bitcoin?", options: ["Vitalik Buterin", "Satoshi Nakamoto", "Charles Hoskinson", "Gavin Wood"], correctIdx: 1, category: "Crypto" },
  { question: "What is the primary gas currency used on the Base L2 network?", options: ["BASE", "ETH", "USDC", "SOL"], correctIdx: 1, category: "Blockchain" },
  { question: "What is an EVM in blockchain technology?", options: ["Ethereum Virtual Machine", "Encrypted Value Method", "Electronic Vault Manager", "External Validator Node"], correctIdx: 0, category: "Web3" },
  { question: "Which algorithm powers Bitcoin's Proof of Work mining?", options: ["SHA-256", "Ethash", "Scrypt", "Equihash"], correctIdx: 0, category: "Crypto" },
  { question: "What is a 'nonce' in blockchain block hashing?", options: ["Number Used Once", "Node Network Certificate", "New Option Code", "Null Operator"], correctIdx: 0, category: "Crypto" },
  { question: "What smart contract function is called to grant token spending permission?", options: ["approve", "allowance", "transfer", "delegate"], correctIdx: 0, category: "Web3" },
  { question: "What is a 'Zero-Knowledge Proof' (ZK-Proof)?", options: ["Proving a statement without revealing underlying data", "A proof with 0 gas cost", "A failed transaction receipt", "An unencrypted signature"], correctIdx: 0, category: "Cryptography" },
  { question: "Which token standard is widely used for Non-Fungible Tokens (NFTs)?", options: ["ERC-20", "ERC-721", "ERC-2000", "EIP-1559"], correctIdx: 1, category: "Web3" },

  // --- Computer Science & Web Dev (16-30) ---
  { question: "Which HTML tag is used to embed JavaScript logic into a web page?", options: ["<js>", "<script>", "<code>", "<logic>"], correctIdx: 1, category: "Web Dev" },
  { question: "Which HTTP status code signifies 'Not Found'?", options: ["200", "500", "404", "403"], correctIdx: 2, category: "Tech" },
  { question: "Which cryptographic function family powers SHA-256?", options: ["Secure Hash Algorithm 2", "MD5", "Keccak", "RSA"], correctIdx: 0, category: "Security" },
  { question: "What does CSS stand for in web design?", options: ["Cascading Style Sheets", "Computer System Styles", "Creative Sheet Syntax", "Central Super Styles"], correctIdx: 0, category: "Web Dev" },
  { question: "What time complexity does a binary search algorithm achieve on sorted arrays?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], correctIdx: 1, category: "Computer Science" },
  { question: "Which CSS layout box model allows flex items to shrink and grow dynamically?", options: ["Grid", "Flexbox", "Float", "Inline-Block"], correctIdx: 1, category: "Web Dev" },
  { question: "What does JSON stand for?", options: ["JavaScript Object Notation", "Java System Option Network", "Joint Serial Object Name", "JavaScript Order System"], correctIdx: 0, category: "Tech" },
  { question: "Which Git command is used to record changes locally before pushing?", options: ["git commit", "git push", "git fetch", "git rebase"], correctIdx: 0, category: "Tech" },
  { question: "Which data structure follows a First-In, First-Out (FIFO) ordering?", options: ["Stack", "Queue", "Binary Tree", "Heap"], correctIdx: 1, category: "Computer Science" },
  { question: "What is TypeScript?", options: ["A typed superset of JavaScript", "A database engine", "A CSS preprocessor", "A mobile operating system"], correctIdx: 0, category: "Web Dev" },
  { question: "Which JavaScript method converts a JSON string into an object?", options: ["JSON.parse()", "JSON.stringify()", "JSON.toObject()", "JSON.serialize()"], correctIdx: 0, category: "Web Dev" },
  { question: "What port number is standard for HTTPS communication?", options: ["80", "8080", "443", "21"], correctIdx: 2, category: "Tech" },
  { question: "Which Linux command lists all files and directories in current path?", options: ["ls", "cd", "pwd", "mkdir"], correctIdx: 0, category: "Tech" },
  { question: "What does SQL stand for?", options: ["Structured Query Language", "System Quick Logic", "Simple Quest List", "Sequential Query Library"], correctIdx: 0, category: "Tech" },
  { question: "Which React hook executes side effects after component rendering?", options: ["useState", "useEffect", "useMemo", "useCallback"], correctIdx: 1, category: "Web Dev" },

  // --- General Knowledge & Trivia (31-45) ---
  { question: "What is the capital city of France?", options: ["Berlin", "Paris", "Madrid", "Rome"], correctIdx: 1, category: "Geography" },
  { question: "Which planet is known as the 'Red Planet' in our solar system?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctIdx: 1, category: "Science" },
  { question: "How many continents are there on planet Earth?", options: ["5", "6", "7", "8"], correctIdx: 2, category: "Geography" },
  { question: "What is the hardest naturally occurring substance on Earth?", options: ["Gold", "Diamond", "Titanium", "Quartz"], correctIdx: 1, category: "Science" },
  { question: "Which ocean is the largest by surface area?", options: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], correctIdx: 1, category: "Geography" },
  { question: "What is the chemical symbol for Gold in the periodic table?", options: ["Go", "Au", "Ag", "Fe"], correctIdx: 1, category: "Science" },
  { question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Claude Monet"], correctIdx: 1, category: "Art & Culture" },
  { question: "Which element has the atomic number 1?", options: ["Helium", "Hydrogen", "Oxygen", "Carbon"], correctIdx: 1, category: "Science" },
  { question: "What is the tallest mountain peak above sea level on Earth?", options: ["K2", "Mount Everest", "Mount Kilimanjaro", "Denali"], correctIdx: 1, category: "Geography" },
  { question: "In which year did World War II end?", options: ["1918", "1945", "1939", "1950"], correctIdx: 1, category: "History" },
  { question: "Which organ pumps blood throughout the human body?", options: ["Lungs", "Heart", "Liver", "Brain"], correctIdx: 1, category: "Science" },
  { question: "What speed does light travel at in a vacuum approximately?", options: ["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "30,000 km/s"], correctIdx: 0, category: "Science" },
  { question: "Which country is home to the ancient Pyramids of Giza?", options: ["Greece", "Egypt", "Italy", "Peru"], correctIdx: 1, category: "History" },
  { question: "What is the currency of Japan?", options: ["Yuan", "Yen", "Won", "Baht"], correctIdx: 1, category: "General Knowledge" },
  { question: "How many bones are in the adult human skeleton?", options: ["180", "206", "250", "300"], correctIdx: 1, category: "Science" },

  // --- Science & Nature (46-60) ---
  { question: "What gas do plants absorb during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctIdx: 1, category: "Science" },
  { question: "What is the boiling point of water at standard sea level atmospheric pressure?", options: ["90°C", "100°C", "110°C", "80°C"], correctIdx: 1, category: "Science" },
  { question: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Earth", "Mars"], correctIdx: 1, category: "Science" },
  { question: "What is the primary constituent gas of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], correctIdx: 1, category: "Science" },
  { question: "What unit is used to measure electrical resistance?", options: ["Volt", "Ohm", "Ampere", "Watt"], correctIdx: 1, category: "Science" },
  { question: "What is the largest mammal on Earth?", options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correctIdx: 1, category: "Science" },
  { question: "What natural phenomenon is measured using the Richter scale?", options: ["Hurricanes", "Earthquakes", "Tornadoes", "Tsunamis"], correctIdx: 1, category: "Science" },
  { question: "Which metal is liquid at room temperature?", options: ["Mercury", "Lead", "Iron", "Zinc"], correctIdx: 0, category: "Science" },
  { question: "What force keeps planets orbiting around the Sun?", options: ["Magnetism", "Gravity", "Friction", "Nuclear Force"], correctIdx: 1, category: "Science" },
  { question: "What is the smallest unit of matter retaining chemical properties?", options: ["Molecule", "Atom", "Electron", "Proton"], correctIdx: 1, category: "Science" },
  { question: "Which vitamin is synthesized by human skin when exposed to sunlight?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin B12"], correctIdx: 2, category: "Science" },
  { question: "What is the center of an atom called?", options: ["Electron Cloud", "Nucleus", "Proton Ring", "Orbital"], correctIdx: 1, category: "Science" },
  { question: "How long does it take for Earth to complete one full revolution around the Sun?", options: ["24 hours", "30 days", "365 days", "100 days"], correctIdx: 2, category: "Science" },
  { question: "What color does chlorophyll reflect, giving plants their hue?", options: ["Red", "Green", "Blue", "Yellow"], correctIdx: 1, category: "Science" },
  { question: "What layer of Earth's atmosphere protects us from harmful ultraviolet radiation?", options: ["Troposphere", "Ozone Layer", "Mesosphere", "Exosphere"], correctIdx: 1, category: "Science" },

  // --- History & World Culture (61-75) ---
  { question: "Who was the first President of the United States?", options: ["Thomas Jefferson", "George Washington", "Abraham Lincoln", "John Adams"], correctIdx: 1, category: "History" },
  { question: "Which empire built the Colosseum in Rome?", options: ["Greek Empire", "Roman Empire", "Ottoman Empire", "Byzantine Empire"], correctIdx: 1, category: "History" },
  { question: "In which year did the Apollo 11 moon landing take place?", options: ["1965", "1969", "1972", "1959"], correctIdx: 1, category: "History" },
  { question: "Who wrote the play 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Oscar Wilde"], correctIdx: 1, category: "Literature" },
  { question: "Which ancient civilization constructed the Great Wall?", options: ["Mongols", "Chinese", "Persians", "Romans"], correctIdx: 1, category: "History" },
  { question: "What was the name of the ship that brought the Pilgrims to America in 1620?", options: ["Santa Maria", "Mayflower", "Endeavour", "Beagle"], correctIdx: 1, category: "History" },
  { question: "Which country gifted the Statue of Liberty to the United States?", options: ["Britain", "France", "Spain", "Germany"], correctIdx: 1, category: "History" },
  { question: "Who discovered penicillin in 1928?", options: ["Louis Pasteur", "Alexander Fleming", "Marie Curie", "Robert Koch"], correctIdx: 1, category: "Science & History" },
  { question: "Which canal connects the Mediterranean Sea to the Red Sea?", options: ["Panama Canal", "Suez Canal", "Erie Canal", "Kiel Canal"], correctIdx: 1, category: "Geography" },
  { question: "Who was known as the 'Iron Lady' in British politics?", options: ["Queen Elizabeth II", "Margaret Thatcher", "Theresa May", "Indira Gandhi"], correctIdx: 1, category: "History" },
  { question: "Which city was the first to be targeted with an atomic bomb in 1945?", options: ["Tokyo", "Hiroshima", "Nagasaki", "Osaka"], correctIdx: 1, category: "History" },
  { question: "What island nation is famous for ancient Moai stone statues?", options: ["Hawaii", "Easter Island", "Fiji", "Madagascar"], correctIdx: 1, category: "Geography" },
  { question: "Which famous scientist formulated the Theory of General Relativity?", options: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Galileo Galilei"], correctIdx: 1, category: "Science" },
  { question: "What was the primary language of the ancient Roman Empire?", options: ["Greek", "Latin", "Italian", "Aramaic"], correctIdx: 1, category: "History" },
  { question: "Which famous wall divided the city of Berlin from 1961 to 1989?", options: ["Iron Wall", "Berlin Wall", "Maginot Line", "Hadrian's Wall"], correctIdx: 1, category: "History" },

  // --- Entertainment, Sports & Tech (76-100+) ---
  { question: "How many players are on the field for one team in a standard soccer (football) match?", options: ["9", "11", "10", "12"], correctIdx: 1, category: "Sports" },
  { question: "Which game features a battle royale island and building mechanics created by Epic Games?", options: ["Minecraft", "Fortnite", "PUBG", "Apex Legends"], correctIdx: 1, category: "Gaming" },
  { question: "How many rings are featured on the official Olympic flag?", options: ["4", "5", "6", "7"], correctIdx: 1, category: "Sports" },
  { question: "Which company developed the iOS operating system for iPhones?", options: ["Google", "Apple", "Microsoft", "Samsung"], correctIdx: 1, category: "Tech" },
  { question: "What is the highest possible break score in a game of snooker?", options: ["100", "147", "180", "200"], correctIdx: 1, category: "Sports" },
  { question: "Which movie won the Best Picture Oscar at the 92nd Academy Awards in 2020?", options: ["1917", "Parasite", "Joker", "Once Upon a Time in Hollywood"], correctIdx: 1, category: "Movies" },
  { question: "In chess, which piece can move in an 'L' shape?", options: ["Bishop", "Knight", "Rook", "Pawn"], correctIdx: 1, category: "Gaming" },
  { question: "Which sport is played at Wimbledon in London?", options: ["Golf", "Tennis", "Cricket", "Polo"], correctIdx: 1, category: "Sports" },
  { question: "Who directed the movie 'Jurassic Park' released in 1993?", options: ["James Cameron", "Steven Spielberg", "Christopher Nolan", "George Lucas"], correctIdx: 1, category: "Movies" },
  { question: "What iconic character in video games wears a red cap and rescues Princess Peach?", options: ["Link", "Mario", "Sonic", "Zelda"], correctIdx: 1, category: "Gaming" },
  { question: "Which instrument has 88 keys on a standard keyboard layout?", options: ["Organ", "Piano", "Accordion", "Harpsichord"], correctIdx: 1, category: "Music" },
  { question: "What is the national sport of Canada in winter?", options: ["Curling", "Ice Hockey", "Skiing", "Lacrosse"], correctIdx: 1, category: "Sports" },
  { question: "Which superhero is also known as Bruce Wayne?", options: ["Superman", "Batman", "Spider-Man", "Iron Man"], correctIdx: 1, category: "Pop Culture" },
  { question: "In basketball, how many points is a shot made from beyond the arc worth?", options: ["1", "2", "3", "4"], correctIdx: 2, category: "Sports" },
  { question: "Which popular video game series features the character 'Master Chief'?", options: ["Call of Duty", "Halo", "Doom", "Gears of War"], correctIdx: 1, category: "Gaming" },
  { question: "What company created the Android operating system before acquisition by Google?", options: ["Android Inc.", "Nokia", "Motorola", "HTC"], correctIdx: 0, category: "Tech" },
  { question: "Which artist released the famous pop album 'Thriller' in 1982?", options: ["Prince", "Michael Jackson", "Stevie Wonder", "Madonna"], correctIdx: 1, category: "Music" },
  { question: "What is the main ingredient in authentic Italian guacamole?", options: ["Tomato", "Avocado", "Cucumber", "Olive"], correctIdx: 1, category: "Food" },
  { question: "Which planet is famous for its prominent planetary ring system?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correctIdx: 1, category: "Science" },
  { question: "How many sides does a regular hexagon have?", options: ["5", "6", "7", "8"], correctIdx: 1, category: "Mathematics" },
  { question: "What is the square root of 144?", options: ["10", "12", "14", "16"], correctIdx: 1, category: "Mathematics" },
  { question: "Which country hosted the 2016 Summer Olympic Games?", options: ["China", "Brazil", "UK", "Japan"], correctIdx: 1, category: "Sports" },
  { question: "What element does 'O' represent on the periodic table?", options: ["Osmium", "Oxygen", "Gold", "Oganesson"], correctIdx: 1, category: "Science" },
  { question: "Which fantasy universe features Hobbits, Elves, and the One Ring?", options: ["Narnia", "Lord of the Rings", "Harry Potter", "Witcher"], correctIdx: 1, category: "Literature" },
  { question: "What is the capital city of Australia?", options: ["Sydney", "Canberra", "Melbourne", "Brisbane"], correctIdx: 1, category: "Geography" },
];

function decodeHTML(html: string): string {
  if (typeof document !== "undefined") {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }
  return html.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function fetchTriviaQuestions(amount = 10): Promise<TriviaQuestion[]> {
  const resultQuestions: TriviaQuestion[] = [];

  // Try fetching from Open Trivia DB with random category selection
  try {
    const randomCat = OPENTDB_CATEGORIES[Math.floor(Math.random() * OPENTDB_CATEGORIES.length)];
    const res = await fetch(`https://opentdb.com/api.php?amount=${amount * 2}&category=${randomCat}&type=multiple`);
    
    if (res.ok) {
      const data = await res.json();
      if (data.response_code === 0 && Array.isArray(data.results) && data.results.length > 0) {
        for (const q of data.results) {
          const decodedQuestion = decodeHTML(q.question);

          // Skip if question was already used in this session
          if (usedQuestionTexts.has(decodedQuestion)) continue;

          usedQuestionTexts.add(decodedQuestion);
          const incorrect = q.incorrect_answers.map(decodeHTML);
          const correct = decodeHTML(q.correct_answer);

          const options = [...incorrect];
          const insertIdx = Math.floor(Math.random() * 4);
          options.splice(insertIdx, 0, correct);

          resultQuestions.push({
            id: resultQuestions.length + 1,
            question: decodedQuestion,
            options,
            correctIdx: insertIdx,
            category: decodeHTML(q.category),
          });

          if (resultQuestions.length >= amount) break;
        }
      }
    }
  } catch (e) {
    console.warn("TriviaQuestions: Open Trivia DB fetch failed. Using fallback question bank.", e);
  }

  // Fill remaining required questions from 100+ FALLBACK_QUESTIONS bank without duplicates
  if (resultQuestions.length < amount) {
    // Filter out fallback questions already used
    let unusedFallbacks = FALLBACK_QUESTIONS.filter((fq) => !usedQuestionTexts.has(fq.question));

    // Reset used questions set if exhausted
    if (unusedFallbacks.length < amount - resultQuestions.length) {
      usedQuestionTexts.clear();
      unusedFallbacks = [...FALLBACK_QUESTIONS];
    }

    // Shuffle fallback candidates
    const shuffled = [...unusedFallbacks].sort(() => Math.random() - 0.5);

    for (const fq of shuffled) {
      usedQuestionTexts.add(fq.question);

      resultQuestions.push({
        id: resultQuestions.length + 1,
        question: fq.question,
        options: fq.options,
        correctIdx: fq.correctIdx,
        category: fq.category,
      });

      if (resultQuestions.length >= amount) break;
    }
  }

  return resultQuestions;
}

export function resetUsedTriviaQuestions(): void {
  usedQuestionTexts.clear();
}
