import { loadLocalLeaderboard, saveLocalScore, LeaderboardScore } from "../../components/Leaderboard";

export class LeaderboardAPI {
  static getScores(game?: "speed_trivia" | "word_pot" | "word_duel"): LeaderboardScore[] {
    const all = loadLocalLeaderboard();
    if (game) {
      return all.filter((s) => s.game === game);
    }
    return all;
  }

  static submitScore(walletAddress: string, game: "speed_trivia" | "word_pot" | "word_duel", score: number): void {
    const formattedAddress = walletAddress.length > 12 
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;

    saveLocalScore({
      walletAddress: formattedAddress,
      game,
      score,
      date: new Date().toISOString().split("T")[0],
    });
  }
}
