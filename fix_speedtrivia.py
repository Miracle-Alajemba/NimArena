with open('frontend/src/pages/SpeedTriviaPage.tsx', 'r') as f:
    content = f.read()

# Add import for TriviaPractice
content = content.replace('import { TriviaResults } from "../components/trivia/TriviaResults";', 'import { TriviaResults } from "../components/trivia/TriviaResults";\nimport { TriviaPractice } from "../components/trivia/TriviaPractice";')

# Add isPracticeActive state
content = content.replace('const [roundId, setRoundId] = useState<number | null>(null);', 'const [roundId, setRoundId] = useState<number | null>(null);\n  const [isPracticeActive, setIsPracticeActive] = useState<boolean>(false);')

# Pass onStartPractice to TriviaLobby
content = content.replace('onStartTrivia={(id, fee) => {', 'onStartPractice={() => setIsPracticeActive(true)}\n              onStartTrivia={(id, fee) => {')

# Add Practice rendering condition
practice_component = """      ) : isPracticeActive ? (
        <div className="flex-1 w-full flex flex-col pt-4 pb-24">
          <TriviaPractice 
            onExit={() => setIsPracticeActive(false)} 
            onChallengeReal={() => setIsPracticeActive(false)} 
          />
        </div>
      ) : ("""
content = content.replace(') : (', practice_component, 1)

with open('frontend/src/pages/SpeedTriviaPage.tsx', 'w') as f:
    f.write(content)
print("Success: SpeedTriviaPage.tsx updated")
