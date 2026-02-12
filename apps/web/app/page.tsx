"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { GameState } from "@operative/shared";
import GameBoard from "../components/GameBoard";

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for Game Created
    socket.on("game_created", (newGame: GameState) => {
      setGameState(newGame);
      setLoading(false);
    });

    // Listen for Game Joined (if you join someone else)
    socket.on("game_joined", (newGame: GameState) => {
      setGameState(newGame);
      setLoading(false);
    });

    return () => {
      socket.off("game_created");
      socket.off("game_joined");
    };
  }, [socket]);

  const handleCreateGame = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("create_game");
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-red-500 font-mono animate-pulse">
        CONNECTING TO SECURE SERVER...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center py-12">
      {/* Header */}
      <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">
        OPERATIVE
      </h1>
      <p className="text-neutral-500 font-mono text-sm mb-12">TOP SECRET // CLEARANCE LEVEL 5</p>

      {/* View Switcher: Lobby vs Game */}
      {!gameState ? (
        <div className="flex flex-col gap-4 items-center">
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="px-8 py-4 bg-white text-black font-bold text-xl rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? "INITIALIZING..." : "CREATE MISSION"}
          </button>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="ENTER CODE" 
              className="bg-neutral-800 border border-neutral-700 p-2 rounded text-center font-mono uppercase text-white focus:outline-none focus:border-white"
              maxLength={4}
            />
            <button className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold rounded hover:bg-neutral-700 hover:text-white transition-colors">
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
