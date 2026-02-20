// apps/web/app/page.tsx
"use client";

import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
import { useSocket } from "../context/SocketContext";
import { GameState } from "@operative/shared";
import styles from "./Home.module.css"; 

// --- Dynamic Imports (Client Side Only) ---
// This forces the CSS to load on the client, fixing the styling issue on Vercel/Production
// const Lobby = dynamic(() => import("./components/Lobby"), { 
//   ssr: false,
//   loading: () => <div className="animate-pulse" style={{padding: '2rem', color: '#a3a3a3'}}>LOADING HQ...</div>
// });

// const GameBoard = dynamic(() => import("./components/GameBoard"), { 
//   ssr: false,
//   loading: () => <div className="animate-pulse" style={{padding: '2rem', color: '#a3a3a3'}}>LOADING MISSION...</div>
// });

import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"welcome" | "game">("welcome");

  useEffect(() => {
    if (!socket) return;

    socket.on("game_updated", (newGame: GameState) => {
      setGameState(newGame);
      setLoading(false);
      setView("game");
    });

    socket.on("error", (msg: string) => {
      alert(msg);
      setLoading(false);
    });

    return () => {
      socket.off("game_updated");
      socket.off("error");
    };
  }, [socket]);

  const handleCreateGame = () => {
    if (!socket || !playerName) return alert("Please enter your name");
    setLoading(true);
    socket.emit("create_game", playerName);
  };

  const handleJoinGame = () => {
    if (!socket || !joinCode || !playerName) return alert("Please enter name and code");
    setLoading(true);
    socket.emit("join_game", { roomCode: joinCode, playerName });
  }

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div style={{color: 'var(--red-primary)', fontFamily: 'monospace'}} className="animate-pulse">
          CONNECTING TO SECURE SERVER...
        </div>
      </div>
    );
  }

  if (view === "welcome") {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>OPERATIVE</h1>
        
        <div className={styles.card}>
          <label className={styles.label}>IDENTIFICATION</label>
          <input 
            type="text" 
            placeholder="CODENAME" 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className={styles.input}
          />

          <div className={styles.buttonGroup}>
            <button
              onClick={handleCreateGame}
              disabled={loading || !playerName}
              className={styles.createButton}
            >
              {loading ? "INITIALIZING..." : "CREATE MISSION"}
            </button>
            
            <div className={styles.joinRow}>
              <input 
                type="text" 
                placeholder="CODE" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className={styles.codeInput}
                maxLength={4}
              />
              <button 
                onClick={handleJoinGame}
                disabled={loading || !playerName || joinCode.length !== 4}
                className={styles.joinButton}
              >
                JOIN SQUAD
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', width: '100%', background: 'var(--bg-app)' }}>
      {gameState?.phase === "lobby" ? (
        <Lobby gameState={gameState} currentPlayerId={socket?.id} />
      ) : (
        gameState && <GameBoard gameState={gameState} />
      )}
    </main>
  );
}
