import re

with open('frontend/src/App.tsx', 'r') as f:
    content = f.read()

# Add PracticeArenaPage import
if "import { PracticeArenaPage }" not in content:
    content = content.replace('import { HistoryPage } from "./pages/HistoryPage";', 'import { HistoryPage } from "./pages/HistoryPage";\nimport { PracticeArenaPage } from "./pages/PracticeArenaPage";')

# Update ViewState
content = content.replace('type ViewState = "lobby" | "leaderboard" | "history" | "game_word_duel" | "game_trivia";', 'type ViewState = "lobby" | "leaderboard" | "history" | "game_word_duel" | "game_trivia" | "practice_arena";')

# Update activeTab mapper
content = content.replace('view === "game_word_duel" || view === "game_trivia" || view === "lobby"', 'view === "game_word_duel" || view === "game_trivia" || view === "practice_arena" || view === "lobby"')

# Update handleSelectGame
old_handleSelectGame = """  const handleSelectGame = (game: "word_duel" | "speed_trivia") => {
    if (game === "word_duel") {
      setView("game_word_duel");
    } else {
      setView("game_trivia");
    }
  };"""

new_handleSelectGame = """  const handleSelectGame = (game: "word_duel" | "speed_trivia" | "practice_arena") => {
    if (game === "word_duel") {
      setView("game_word_duel");
    } else if (game === "speed_trivia") {
      setView("game_trivia");
    } else if (game === "practice_arena") {
      setView("practice_arena");
    }
  };"""
content = content.replace(old_handleSelectGame, new_handleSelectGame)

# Add PracticeArenaPage router component
if "view === \"practice_arena\"" not in content:
    practice_block = """
      {view === "practice_arena" && (
        <PracticeArenaPage onExit={handleNavigateHome} onChallengeReal={() => setView("game_word_duel")} />
      )}
"""
    content = content.replace('{view === "history" && (', practice_block + '\n      {view === "history" && (')

with open('frontend/src/App.tsx', 'w') as f:
    f.write(content)
print("Success: App.tsx updated")
