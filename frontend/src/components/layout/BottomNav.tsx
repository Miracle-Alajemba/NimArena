import React from "react";
import { Gamepad2, Trophy, History } from "lucide-react";

export type ActiveTab = "lobby" | "leaderboard" | "history";

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNavigateHome?: () => void; // custom reset callback
}

export function BottomNav({ activeTab, setActiveTab, onNavigateHome }: BottomNavProps) {
  const tabs = [
    { id: "lobby" as ActiveTab, label: "Lobby", icon: Gamepad2 },
    { id: "leaderboard" as ActiveTab, label: "Leaderboard", icon: Trophy },
    { id: "history" as ActiveTab, label: "History", icon: History },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (tabId === "lobby" && onNavigateHome) {
      onNavigateHome();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 py-2 bg-[#13131A] border-t border-[#1F1F2E] flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            style={{ minHeight: "44px", minWidth: "60px" }} // min tap target requirement
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              isActive ? "text-[#7C3AED]" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
            <span className="text-[10px] font-bold tracking-wide uppercase font-body">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
export default BottomNav;
