// apps/web/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { GameState } from "@operative/shared";
import styles from "./Home.module.css"; 

import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"welcome" | "game">("welcome");
  const [deviceId, setDeviceId] = useState("");
  
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000); 
  };

  useEffect(() => {
    let storedId = localStorage.getItem("operative_device_id");
    if (!storedId) {
      storedId = "dev_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("operative_device_id", storedId);
    }
    setDeviceId(storedId);
  }, []);

  useEffect(() => {
    if (!socket || !deviceId) return;
    socket.emit("reconnect_user", deviceId);
  }, [socket, deviceId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("game_updated", (newGame: GameState) => {
      setGameState(newGame);
      setLoading(false);
      setView("game"); 
    });

    socket.on("error", (msg: string) => {
      showToast(msg); 
      setLoading(false);
    });

    return () => {
      socket.off("game_updated");
      socket.off("error");
    };
  }, [socket]);

  // NEW: Theming Engine Global Setter
  useEffect(() => {
    if (gameState?.theme) {
      document.documentElement.setAttribute('data-theme', gameState.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark'); // Default
    }
  }, [gameState?.theme]);

  const handleCreateGame = () => {
    if (!socket || !playerName) return showToast("PLEASE ENTER CODENAME"); 
    setLoading(true);
    socket.emit("create_game", { hostName: playerName, deviceId });
  };

  const handleJoinGame = () => {
    if (!socket || !joinCode || !playerName) return showToast("PLEASE ENTER NAME AND CODE"); 
    setLoading(true);
    socket.emit("join_game", { roomCode: joinCode, playerName, deviceId });
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
        {toast && <div className={styles.toast}>{toast}</div>}

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
