import React, { useState, useCallback } from "react";
import { NimiqProvider, useNimiq } from "./hooks/useNimiq";
import { LobbyPage } from "./pages/LobbyPage";
import { WordDuelPage } from "./pages/WordDuelPage";
import { SpeedTriviaPage } from "./pages/SpeedTriviaPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BottomNav, ActiveTab } from "./components/layout/BottomNav";
import { USDTRipple } from "./components/layout/USDTRipple";
import { AlertCircle } from "lucide-react";

type ViewState = "lobby" | "leaderboard" | "history" | "game_word_duel" | "game_trivia";

function AppContent() {
  const { isReady, error } = useNimiq();
  const [view, setView] = useState<ViewState>("lobby");
  const [rippleActive, setRippleActive] = useState<boolean>(false);

  // Tab mapper for navigation
  const activeTab: ActiveTab = 
    view === "game_word_duel" || view === "game_trivia" || view === "lobby"
      ? "lobby"
      : (view as ActiveTab);

  const handleSelectGame = (game: "word_duel" | "speed_trivia") => {
    if (game === "word_duel") {
      setView("game_word_duel");
    } else {
      setView("game_trivia");
    }
  };

  const handleNavigateHome = () => {
    setView("lobby");
  };

  const handleShowRipple = useCallback(() => {
    setRippleActive(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    setRippleActive(false);
  }, []);

  // Display initialization loader
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0F] text-gray-400 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-t-transparent border-[#7C3AED] animate-spin" />
        <span className="text-sm font-extrabold uppercase tracking-wider font-display text-white animate-pulse">
          Starting NimArena SDK...
        </span>
        <span className="text-[10px] text-gray-600 font-mono">Loading injected providers</span>
      </div>
    );
  }

  // Display initialization errors
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0F] text-[#EF4444] px-6 text-center gap-4">
        <AlertCircle className="w-12 h-12 opacity-80" />
        <h2 className="text-xl font-extrabold uppercase tracking-wide font-display text-white">
          SDK Launch Failed
        </h2>
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
          {error}. Make sure the app is opened inside the Nimiq Pay wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 relative select-none">
      {/* USDT Ripple Payout Animation */}
      <USDTRipple active={rippleActive} onAnimationEnd={handleAnimationEnd} />

      {/* Pages Switcher */}
      {view === "lobby" && (
        <LobbyPage onSelectGame={handleSelectGame} />
      )}

      {view === "game_word_duel" && (
        <WordDuelPage onShowRipple={handleShowRipple} onExit={handleNavigateHome} />
      )}

      {view === "game_trivia" && (
        <SpeedTriviaPage onShowRipple={handleShowRipple} onExit={handleNavigateHome} />
      )}

      {view === "leaderboard" && (
        <LeaderboardPage />
      )}

      {view === "history" && (
        <HistoryPage />
      )}

      {/* Persistent Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => setView(tab)}
        onNavigateHome={handleNavigateHome}
      />
    </div>
  );
}

export function App() {
  return (
    <NimiqProvider>
      <AppContent />
    </NimiqProvider>
  );
}

export default App;
