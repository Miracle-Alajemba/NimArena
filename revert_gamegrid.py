import re

with open('frontend/src/components/lobby/GameGrid.tsx', 'r') as f:
    content = f.read()

# Revert Props
content = content.replace('onSelectGame: (game: "word_duel" | "speed_trivia" | "practice_arena") => void;', 'onSelectGame: (game: "word_duel" | "speed_trivia") => void;')

# Remove Practice Arena Card
# It's bounded by {/* Practice Arena Card */} and {/* Number Rush Placeholder */}
pattern = r'\{\s*/\*\s*Practice Arena Card\s*\*/\s*\}.*?(?=\{\s*/\*\s*Number Rush Placeholder\s*\*/\s*\})'
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('frontend/src/components/lobby/GameGrid.tsx', 'w') as f:
    f.write(content)
print("Success: GameGrid.tsx reverted")
