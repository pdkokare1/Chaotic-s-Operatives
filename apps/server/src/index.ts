// apps/server/src/index.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db";
import { GameModel } from "./models/Game";
import { generateGame, makeMove, addPlayer, removePlayer, updatePlayer, startGame, giveClue, endTurn } from "./gameLogic";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// 1. Connect to Database
connectDB();

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Track which socket is in which room (still needed in memory for fast lookups)
const socketToRoom = new Map<string, string>(); 

// Helper: Save game to DB and broadcast
const saveAndBroadcast = async (roomCode: string, gameState: any) => {
  // Update DB
  await GameModel.findOneAndUpdate(
    { roomCode }, 
    { state: gameState, lastUpdated: new Date() },
    { upsert: true }
  );
  // Broadcast to players
  io.to(roomCode).emit("game_updated", gameState);
};

// Helper: Fetch game from DB
const getGame = async (roomCode: string) => {
  const doc = await GameModel.findOne({ roomCode });
  return doc ? doc.state : null;
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // --- Create Game ---
  socket.on("create_game", async (payload: any) => {
    // Backward compatibility for old clients before refresh
    const hostName = typeof payload === "string" ? payload : payload.hostName;
    const deviceId = typeof payload === "string" ? undefined : payload.deviceId;

    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    let gameState = generateGame(roomCode);
    const name = hostName || "Host";
    
    // Pass deviceId to state
    gameState = addPlayer(gameState, socket.id, name, deviceId);
    
    socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    
    await saveAndBroadcast(roomCode, gameState);
    console.log(`Game Created: ${roomCode}`);
  });

  // --- Join Game ---
  socket.on("join_game", async ({ roomCode, playerName, deviceId }) => {
    const code = roomCode.trim().toUpperCase();
    let gameState = await getGame(code);

    if (gameState) {
      const name = playerName || `Agent ${socket.id.substring(0, 3)}`;
      
      // --- RECONNECTION LOGIC ---
      const existingPlayer = gameState.players.find((p: any) => p.deviceId && p.deviceId === deviceId);
      
      if (existingPlayer) {
        // Player refreshed! Update their socket ID instead of creating a new player.
        gameState.players = gameState.players.map((p: any) => 
          p.deviceId === deviceId ? { ...p, id: socket.id, name } : p
        );
        console.log(`♻️ ${name} reconnected to ${code}`);
      } else {
        // Brand new player
        gameState = addPlayer(gameState, socket.id, name, deviceId);
        console.log(`✅ ${name} joined ${code}`);
      }

      socketToRoom.set(socket.id, code);
      socket.join(code);
      
      await saveAndBroadcast(code, gameState);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  // --- Lobby Actions ---
  socket.on("change_team", async (team) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      let gameState = await getGame(code);
      if (gameState) {
        gameState = updatePlayer(gameState, socket.id, { team, role: "operative" });
        await saveAndBroadcast(code, gameState);
      }
    }
  });

  socket.on("change_role", async (role) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      let gameState = await getGame(code);
      if (gameState) {
        gameState = updatePlayer(gameState, socket.id, { role });
        await saveAndBroadcast(code, gameState);
      }
    }
  });

  socket.on("start_game", async () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      let gameState = await getGame(code);
      if (gameState) {
        gameState = startGame(gameState);
        await saveAndBroadcast(code, gameState);
      }
    }
  });

  // --- Game Actions ---
  socket.on("reveal_card", async ({ roomCode, cardId }) => {
    const code = roomCode.trim().toUpperCase();
    let gameState = await getGame(code);
    if (gameState) {
      gameState = makeMove(gameState, cardId);
      await saveAndBroadcast(code, gameState);
    }
  });

  socket.on("give_clue", async ({ word, number }) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      let gameState = await getGame(code);
      if (gameState) {
        gameState = giveClue(gameState, word, number);
        await saveAndBroadcast(code, gameState);
      }
    }
  });

  socket.on("end_turn", async () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      let gameState = await getGame(code);
      if (gameState) {
        gameState = endTurn(gameState);
        await saveAndBroadcast(code, gameState);
      }
    }
  });

  socket.on("restart_game", async (roomCode) => {
    const code = roomCode.trim().toUpperCase();
    let oldState = await getGame(code);
    if (oldState) {
      let newState = generateGame(code);
      newState.players = oldState.players;
      newState.phase = "lobby"; 
      newState.logs = ["Mission Reset. Prepare for deployment."];
      await saveAndBroadcast(code, newState);
    }
  });

  // --- Disconnect ---
  socket.on("disconnect", async () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      let gameState = await getGame(code);
      if (gameState) {
        // PHASE 1 CHANGE: We no longer strictly remove players on disconnect so they can reconnect.
        // I am commenting this out rather than deleting it as per your strict instructions.
        // gameState = removePlayer(gameState, socket.id);
        
        // If completely empty, maybe delete to clean up?
        if (gameState.players.length === 0) {
          await GameModel.deleteOne({ roomCode: code });
        } else {
          await saveAndBroadcast(code, gameState);
        }
      }
    }
    socketToRoom.delete(socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
