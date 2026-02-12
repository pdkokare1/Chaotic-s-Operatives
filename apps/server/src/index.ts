import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { generateGame, makeMove } from "./gameLogic"; // Import makeMove

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-Memory Storage
const games = new Map<string, any>();

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Event: Create Game
  socket.on("create_game", () => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const gameState = generateGame(roomCode);
    games.set(roomCode, gameState);

    socket.join(roomCode);
    io.to(roomCode).emit("game_updated", gameState); // Broadcast to room
    console.log(`Game Created: ${roomCode}`);
  });

  // Event: Join Game
  socket.on("join_game", (roomCode: string) => {
    const code = roomCode.trim().toUpperCase();
    if (games.has(code)) {
      socket.join(code);
      const gameState = games.get(code);
      socket.emit("game_updated", gameState);
      console.log(`User joined ${code}`);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  // --- NEW Event: Reveal Card ---
  socket.on("reveal_card", ({ roomCode, cardId }) => {
    const code = roomCode.trim().toUpperCase();
    
    if (games.has(code)) {
      let gameState = games.get(code);
      
      // Run the game rules
      gameState = makeMove(gameState, cardId);
      
      // Save and Broadcast the new state to EVERYONE in the room
      games.set(code, gameState);
      io.to(code).emit("game_updated", gameState);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
