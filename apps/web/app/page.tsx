"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { GameState } from "@operative/shared";
import GameBoard from "../components/GameBoard";

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (!socket) return;

    // UNIFIED EVENT: Whether we create, join, or move, the server sends "game_updated"
    socket.on("game_updated", (newGame: GameState) => {
      setGameState(newGame);
      setLoading(false);
    });

    socket.on("error", (msg: string) => {
      alert(msg); // Simple alert for errors (like "Room not found")
      setLoading(false);
    });

    return () => {
      socket.off("game_updated");
      socket.off("error");
    };
  }, [socket]);

  const handleCreateGame = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("create_game");
  };

  const handleJoinGame = () => {
    if (!socket || !joinCode) return;
    setLoading(true);
    socket.emit("join_game", joinCode);
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-red-500 font-mono animate-pulse">
        CONNECTING TO SECURE SERVER...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center py-12 px-4">
      {/* Header */}
      <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">
        OPERATIVE
      </h1>
      <p className="text-neutral-500 font-mono text-xs md:text-sm mb-12">TOP SECRET // CLEARANCE LEVEL 5</p>

      {/* View Switcher: Lobby vs Game */}
      {!gameState ? (
        <div className="flex flex-col gap-4 items-center w-full max-w-md">
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="w-full px-8 py-4 bg-white text-black font-bold text-xl rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? "INITIALIZING..." : "CREATE MISSION"}
          </button>
          
          <div className="w-full flex gap-2">
            <input 
              type="text" 
              placeholder="ENTER CODE" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-neutral-800 border border-neutral-700 p-2 rounded text-center font-mono uppercase text-white focus:outline-none focus:border-white placeholder:text-neutral-600"
              maxLength={4}
            />
            <button 
              onClick={handleJoinGame}
              disabled={loading || joinCode.length !== 4}
              className="px-6 py-2 bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold rounded hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-30"
            >
              JOIN
            </button>
          </div>
        </div>
      ) : (
        <GameBoard gameState={gameState} />
      )}
    </main>
  );
}
