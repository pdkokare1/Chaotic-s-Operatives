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

const socketToRoom = new Map<string, string>(); 

// NEW: Queue system to prevent MongoDB race conditions when events happen rapidly
const roomLocks = new Map<string, Promise<void>>();
const withLock = async (code: string, fn: () => Promise<void>) => {
  const currentLock = roomLocks.get(code) || Promise.resolve();
  const nextLock = currentLock.then(async () => {
    try { await fn(); } catch (e) { console.error(e); }
  });
  roomLocks.set(code, nextLock);
  return nextLock;
};

// Helper: Save game to DB and broadcast
const saveAndBroadcast = async (roomCode: string, gameState: any) => {
  await GameModel.findOneAndUpdate(
    { roomCode }, 
    { state: gameState, lastUpdated: new Date() },
    { upsert: true }
  );
  io.to(roomCode).emit("game_updated", gameState);
};

// Helper: Fetch game from DB
const getGame = async (roomCode: string) => {
  const doc = await GameModel.findOne({ roomCode });
  return doc ? doc.state : null;
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // --- Auto Reconnect ---
  socket.on("reconnect_user", async (deviceId) => {
    if (!deviceId) return;
    const gameDoc = await GameModel.findOne({ "state.players.deviceId": deviceId });
    if (gameDoc) {
      let gameState = gameDoc.state;
      const roomCode = gameState.roomCode;
      
      gameState.players = gameState.players.map((p: any) => 
        p.deviceId === deviceId ? { ...p, id: socket.id } : p
      );

      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);
      
      await saveAndBroadcast(roomCode, gameState);
      console.log(`⚡ Auto-reconnected device ${deviceId} to ${roomCode}`);
    }
  });

  // --- Leave Game ---
  socket.on("leave_game", async () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          gameState = removePlayer(gameState, socket.id);
          if (gameState.players.length === 0) {
            await GameModel.deleteOne({ roomCode: code });
          } else {
            await saveAndBroadcast(code, gameState);
          }
        }
      });
      socket.leave(code);
      socketToRoom.delete(socket.id);
      console.log(`🚪 User ${socket.id} intentionally left game ${code}`);
    }
  });

  // --- Create Game ---
  socket.on("create_game", async (payload: any) => {
    const hostName = typeof payload === "string" ? payload : payload.hostName;
    const deviceId = typeof payload === "string" ? undefined : payload.deviceId;

    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    let gameState = generateGame(roomCode);
    const name = hostName || "Host";
    
    gameState = addPlayer(gameState, socket.id, name, deviceId);
    socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    
    await saveAndBroadcast(roomCode, gameState);
    console.log(`Game Created: ${roomCode}`);
  });

  // --- Join Game ---
  socket.on("join_game", async ({ roomCode, playerName, deviceId }) => {
    const code = roomCode.trim().toUpperCase();
    withLock(code, async () => {
      let gameState = await getGame(code);
      if (gameState) {
        const name = playerName || `Agent ${socket.id.substring(0, 3)}`;
        const existingPlayer = gameState.players.find((p: any) => p.deviceId && p.deviceId === deviceId);
        
        if (existingPlayer) {
          gameState.players = gameState.players.map((p: any) => 
            p.deviceId === deviceId ? { ...p, id: socket.id, name } : p
          );
          console.log(`♻️ ${name} reconnected to ${code}`);
        } else {
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
  });

  // --- Lobby Actions ---
  socket.on("change_team", (team) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          gameState = updatePlayer(gameState, socket.id, { team, role: "operative" });
          await saveAndBroadcast(code, gameState);
        }
      });
    }
  });

  socket.on("change_role", (role) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          gameState = updatePlayer(gameState, socket.id, { role });
          await saveAndBroadcast(code, gameState);
        }
      });
    }
  });

  socket.on("start_game", (options: { category: string, timer: number }) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          gameState = startGame(gameState, options);
          await saveAndBroadcast(code, gameState);
        }
      });
    }
  });

  // --- Game Actions ---
  socket.on("reveal_card", ({ roomCode, cardId }) => {
    const code = roomCode.trim().toUpperCase();
    withLock(code, async () => {
      let gameState = await getGame(code);
      if (gameState) {
        gameState = makeMove(gameState, cardId);
        await saveAndBroadcast(code, gameState);
      }
    });
  });

  socket.on("give_clue", ({ word, number }) => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          gameState = giveClue(gameState, word, number);
          await saveAndBroadcast(code, gameState);
        }
      });
    }
  });

  socket.on("end_turn", () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          const caller = gameState.players.find((p: any) => p.id === socket.id);
          if (caller && caller.team === gameState.turn) {
            gameState = endTurn(gameState);
            await saveAndBroadcast(code, gameState);
          }
        }
      });
    }
  });

  socket.on("restart_game", (roomCode) => {
    const code = roomCode.trim().toUpperCase();
    withLock(code, async () => {
      let oldState = await getGame(code);
      if (oldState) {
        let newState = generateGame(code);
        newState.players = oldState.players;
        newState.phase = "lobby"; 
        newState.logs = ["Mission Reset. Prepare for deployment."];
        await saveAndBroadcast(code, newState);
      }
    });
  });

  // --- Disconnect ---
  socket.on("disconnect", async () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      withLock(code, async () => {
        let gameState = await getGame(code);
        if (gameState) {
          // Commented out to preserve Phase 1 reconnect functionality
          // gameState = removePlayer(gameState, socket.id);
          if (gameState.players.length === 0) {
            await GameModel.deleteOne({ roomCode: code });
          } else {
            await saveAndBroadcast(code, gameState);
          }
        }
      });
    }
    socketToRoom.delete(socket.id);
  });
});

// --- NEW: Server-Driven Time Loop ---
// Polls active games every 1 second. If time has expired, forces the turn over.
setInterval(async () => {
  try {
    const now = Date.now();
    const expiredGames = await GameModel.find({
      "state.phase": "playing",
      "state.turnEndsAt": { $lte: now, $ne: null }
    });

    for (const doc of expiredGames) {
      const code = doc.roomCode;
      await withLock(code, async () => {
        let gameState = await getGame(code);
        
        // Final sanity check to ensure state hasn't shifted since querying
        if (gameState && gameState.phase === "playing" && gameState.turnEndsAt && gameState.turnEndsAt <= Date.now()) {
          gameState = endTurn(gameState);
          // Add custom server-enforced flavor text over the default 'ended turn' log
          gameState.logs[gameState.logs.length - 1] = "SYSTEM OVERRIDE: TIME EXPIRED. Turn forcibly switched.";
          await saveAndBroadcast(code, gameState);
        }
      });
    }
  } catch (e) {
    console.error("Timer Loop Error:", e);
  }
}, 1000);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
