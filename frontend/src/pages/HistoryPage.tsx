import React from "react";
import Header from "../components/layout/Header";
import History from "../components/history/History";

export function HistoryPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F] pb-24 text-white">
      {/* Header */}
      <Header />

      {/* History log list */}
      <History />
    </div>
  );
}
export default HistoryPage;
