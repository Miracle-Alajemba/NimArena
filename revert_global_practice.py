import re

with open('frontend/src/App.tsx', 'r') as f:
    content = f.read()

# Remove PracticeArenaPage import
content = content.replace('import { PracticeArenaPage } from "./pages/PracticeArenaPage";\n', '')

# Revert ViewState
content = content.replace('type ViewState = "lobby" | "leaderboard" | "history" | "game_word_duel" | "game_trivia" | "practice_arena";', 'type ViewState = "lobby" | "leaderboard" | "history" | "game_word_duel" | "game_trivia";')

# Revert activeTab mapper
content = content.replace('view === "game_word_duel" || view === "game_trivia" || view === "practice_arena" || view === "lobby"', 'view === "game_word_duel" || view === "game_trivia" || view === "lobby"')

# Revert handleSelectGame
old_handleSelectGame = """  const handleSelectGame = (game: "word_duel" | "speed_trivia" | "practice_arena") => {
    if (game === "word_duel") {
      setView("game_word_duel");
    } else if (game === "speed_trivia") {
      setView("game_trivia");
    } else if (game === "practice_arena") {
      setView("practice_arena");
    }
  };"""

new_handleSelectGame = """  const handleSelectGame = (game: "word_duel" | "speed_trivia") => {
    if (game === "word_duel") {
      setView("game_word_duel");
    } else {
      setView("game_trivia");
    }
  };"""
content = content.replace(old_handleSelectGame, new_handleSelectGame)

# Remove PracticeArenaPage router component
pattern = r'\{\s*view\s*===\s*"practice_arena"\s*&&\s*\(\s*<PracticeArenaPage[^>]*>\s*\)\s*\}'
content = re.sub(pattern, '', content)

with open('frontend/src/App.tsx', 'w') as f:
    f.write(content)
print("Success: App.tsx reverted")
