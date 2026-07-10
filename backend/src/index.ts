import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as dotenv from "dotenv";

import wordsRouter from "./routes/words";
import triviaRouter from "./routes/trivia";
import leaderboardRouter from "./routes/leaderboard";
import wordDuelRouter from "./routes/wordDuel";
import dailyRouter from "./routes/daily";
import { startEventSyncService } from "./services/eventSync";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// Rate limiting (prevent API spamming)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

// Mount Express API endpoints
app.use("/api/words", wordsRouter);
app.use("/api/trivia", triviaRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/word-duel", wordDuelRouter);
app.use("/api/daily", dailyRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Configure Socket.io
const io = new Server(httpServer, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  console.log(`Socket: New client connection [ID: ${socket.id}]`);
});

// Start background event synchronization service
startEventSyncService();

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`NimArena Backend Service running on port ${PORT}`);
  console.log(`CORS allowed origin: ${corsOrigin}`);
  console.log(`================================================`);
});
