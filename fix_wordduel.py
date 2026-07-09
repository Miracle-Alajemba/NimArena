with open('frontend/src/pages/WordDuelPage.tsx', 'r') as f:
    content = f.read()

# Add import for WordDuelPractice
content = content.replace('import { DailyChallengeGame } from "../components/wordDuel/DailyChallengeGame";', 'import { DailyChallengeGame } from "../components/wordDuel/DailyChallengeGame";\nimport { WordDuelPractice } from "../components/wordDuel/WordDuelPractice";')

# Add isPracticeActive state
content = content.replace('const [isDailyActive, setIsDailyActive] = useState<boolean>(false);', 'const [isDailyActive, setIsDailyActive] = useState<boolean>(false);\n  const [isPracticeActive, setIsPracticeActive] = useState<boolean>(false);')

# Pass onStartPractice to DuelLobby
content = content.replace('onStartDaily={() => setIsDailyActive(true)}', 'onStartDaily={() => setIsDailyActive(true)}\n              onStartPractice={() => setIsPracticeActive(true)}')

# Add Practice rendering condition
practice_component = """      ) : isPracticeActive ? (
        <div className="flex-1 px-5 w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto pt-4">
          <WordDuelPractice 
            onExit={() => setIsPracticeActive(false)} 
            onChallengeReal={() => setIsPracticeActive(false)} 
          />
        </div>
      ) : ("""
content = content.replace(') : (', practice_component, 1)

with open('frontend/src/pages/WordDuelPage.tsx', 'w') as f:
    f.write(content)
print("Success: WordDuelPage.tsx updated")
