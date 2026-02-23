// apps/web/app/components/GameBoard.tsx
"use client";

import { useState, useEffect } from "react";
import { GameState, ROLES, TEAMS } from "@operative/shared";
import GameCard from "./GameCard";
import DecipherText from "./DecipherText"; 
import TypewriterText from "./TypewriterText"; 
import { useSocket } from "../../context/SocketContext";
import styles from "./GameBoard.module.css";

interface GameBoardProps {
  gameState: GameState;
}

export default function GameBoard({ gameState }: GameBoardProps) {
  const { socket } = useSocket();
  const [clueWord, setClueWord] = useState("");
  const [clueNum, setClueNum] = useState("1");
  const [copied, setCopied] = useState(false);

  const [timeLeft, setTimeLeft] = useState(gameState.timerDuration);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [pendingClue, setPendingClue] = useState<{ word: string, number: number } | null>(null);
  const [crtEnabled, setCrtEnabled] = useState(true);

  const myPlayer = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.turn === myPlayer?.team;
  const isSpymaster = myPlayer?.role === ROLES.SPYMASTER;
  const isHost = gameState.players[0]?.id === myPlayer?.id;
  const [viewAsSpymaster, setViewAsSpymaster] = useState(false);
  const showSpymasterView = isSpymaster || viewAsSpymaster;

  const redTeam = gameState.players.filter(p => p.team === TEAMS.RED);
  const blueTeam = gameState.players.filter(p => p.team === TEAMS.BLUE);

  useEffect(() => {
    setSelectedCardId(null); 
    setPendingClue(null); 
    if (socket && myPlayer) {
      socket.emit("set_target", { roomCode: gameState.roomCode, cardId: null });
    }
  }, [gameState.turn]);

  useEffect(() => {
    if (gameState.timerDuration === 0 || gameState.phase !== "playing" || !gameState.turnEndsAt) {
      setTimeLeft(gameState.timerDuration); 
      return;
    }

    const updateTimer = () => {
      if (!gameState.turnEndsAt) return;
      const remaining = Math.max(0, Math.ceil((gameState.turnEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer(); 
    const timer = setInterval(updateTimer, 500); 

    return () => clearInterval(timer);
  }, [gameState.turnEndsAt, gameState.timerDuration, gameState.phase]);

  const handleCardClick = (cardId: string) => {
    if (!socket || isSpymaster || !isMyTurn || !gameState.currentClue) return;
    
    if (selectedCardId === cardId) {
      socket.emit("reveal_card", { roomCode: gameState.roomCode, cardId });
      setSelectedCardId(null); 
    } else {
      setSelectedCardId(cardId); 
      socket.emit("set_target", { roomCode: gameState.roomCode, cardId }); 
    }
  };

  const handleIncrement = () => {
    let num = parseInt(clueNum);
    if (isNaN(num) || num === 99) return;
    if (num >= 9) setClueNum("99"); 
    else setClueNum((num + 1).toString());
  };

  const handleDecrement = () => {
    let num = parseInt(clueNum);
    if (isNaN(num)) return;
    if (num === 99) setClueNum("9"); 
    else if (num > 0) setClueNum((num - 1).toString());
  };

  const submitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !clueWord) return;
    setPendingClue({ word: clueWord.toUpperCase().trim(), number: parseInt(clueNum) });
  };

  const confirmClue = () => {
    if (!socket || !pendingClue) return;
    socket.emit("give_clue", { word: pendingClue.word, number: pendingClue.number });
    setClueWord("");
    setPendingClue(null);
  };

  const cancelClue = () => {
    setPendingClue(null);
  };

  const endTurn = () => { if (socket) socket.emit("end_turn"); };
  const handleRestart = () => { if (socket && confirm("Reset mission?")) socket.emit("restart_game", gameState.roomCode); };

  const copyCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveMission = () => {
    if (confirm("Are you sure you want to abort the mission?")) {
      if (socket) socket.emit("leave_game");
      window.location.reload();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderLogEntry = (log: string, isNewest: boolean) => {
    const LogText = ({ text, color }: { text: string, color?: string }) => (
      <span style={{ color }}>{isNewest ? <TypewriterText text={text} speed={25} /> : text}</span>
    );

    if (log.includes("FATAL ERROR")) return <><span className={styles.tagFatal}>FATAL</span> <LogText text={log.replace("FATAL ERROR: ", "")} color="var(--red-primary)" /></>;
    if (log.includes("civilian")) return <><span className={styles.tagWarn}>INTEL</span> <LogText text={log} color="var(--yellow-accent)" /></>;
    if (log.startsWith("RED") || log.includes("Red Team")) return <><span className={styles.tagRed}>RED</span> <LogText text={log.replace(/^RED\s/, "")} /></>;
    if (log.startsWith("BLUE") || log.includes("Blue Team")) return <><span className={styles.tagBlue}>BLUE</span> <LogText text={log.replace(/^BLUE\s/, "")} /></>;
    if (log.includes("MISSION") || log.includes("SYSTEM")) return <><span className={styles.tagSystem}>SYSTEM</span> <LogText text={log.replace("SYSTEM OVERRIDE: ", "")} /></>;
    
    return <><span className={styles.tagSystem}>INFO</span> <LogText text={log} /></>;
  };

  const clueHistory = gameState.logs.filter(log => log.includes("Spymaster:"));
  const isFatalError = gameState.logs.some(log => log.includes("FATAL ERROR"));
  const containerClass = `${styles.container} ${gameState.phase === 'playing' ? (gameState.turn === 'red' ? styles.glowRed : styles.glowBlue) : ''} ${isFatalError ? styles.fatalGlitchContainer : ''}`;

  const getDynamicHeaderText = () => {
    if (gameState.phase === "game_over") return "MISSION ACCOMPLISHED";
    if (isMyTurn) {
      if (isSpymaster) {
        return gameState.currentClue ? "AWAITING OPERATIVE ACTION" : "GIVE YOUR OPERATIVES A CLUE";
      } else {
        return gameState.currentClue ? "EXECUTE MISSION: SELECT TARGETS" : "AWAITING SPYMASTER CLUE";
      }
    } else {
      return `AWAITING ${gameState.turn.toUpperCase()} TEAM`;
    }
  };

  return (
    <>
      {crtEnabled && <div className="crt-overlay" />} 
      <div className={containerClass}>
        
        {gameState.phase === "game_over" && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}} className="animate-pulse">
                {gameState.winner === "red" ? "🔴" : "🔵"}
              </div>
              <h2 className={`${styles.winnerTitle} ${gameState.winner === "red" ? styles.redWin : styles.blueWin}`}>
                <DecipherText text={`${gameState.winner?.toUpperCase()} WINS!`} speed={40} /> 
              </h2>
              <p style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>ALL TARGETS NEUTRALIZED</p>
              
              {isHost ? (
                <button onClick={handleRestart} className={styles.restartBtn}>PLAY AGAIN</button>
              ) : <p className="animate-pulse" style={{marginTop: '1rem', fontSize: '0.8rem'}}>Waiting for Host...</p>}
            </div>
          </div>
        )}

        <div className={styles.headerArea}>
          <div className={styles.dynamicHeader}>
            <DecipherText text={getDynamicHeaderText()} speed={20} />
          </div>
          <button onClick={copyCode} className={styles.roomCodeDisplay}>
            <div style={{fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 2}}>{copied ? "COPIED!" : "ROOM CODE"}</div>
            <div className={styles.roomCodeBox}>{gameState.roomCode}</div>
          </button>
        </div>

        <div className={styles.playArea}>
          {/* LEFT SIDEBAR: BLUE TEAM */}
          <div className={`${styles.sidePanel} ${styles.bluePanel} ${gameState.turn === 'blue' ? styles.panelActive : ''}`}>
            <div className={`${styles.progressContainer} ${gameState.turn === 'blue' ? styles.scoreActive : styles.scoreInactive}`}>
              <div className={styles.scoreBlue}>BLUE: {gameState.scores.blue}</div>
              <div className={styles.progressBar}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`${styles.progressSegment} ${i < (8 - gameState.scores.blue) ? styles.segmentBlueFilled : ''}`} />
                ))}
              </div>
            </div>
            <div className={styles.rosterSection}>
              <div className={styles.rosterTitle}>OPERATIVES</div>
              {blueTeam.filter(p => p.role === ROLES.OPERATIVE).map(p => (
                <div key={p.id} className={styles.rosterPlayer}>{p.name} {p.id === socket?.id && "(YOU)"}</div>
              ))}
              <div className={styles.rosterTitle} style={{marginTop: '1rem'}}>SPYMASTER</div>
              {blueTeam.filter(p => p.role === ROLES.SPYMASTER).map(p => (
                <div key={p.id} className={`${styles.rosterPlayer} ${styles.isSpymaster}`}>{p.name} {p.id === socket?.id && "(YOU)"}</div>
              ))}
            </div>
          </div>

          {/* CENTER: GRID */}
          <div className={styles.gridCenter}>
            <div className={styles.grid}>
              {gameState.board.map((card) => {
                const targetingTeammates = gameState.players
                  .filter(p => p.currentTarget === card.id && p.id !== socket?.id && p.team === myPlayer?.team)
                  .map(p => p.name);

                return (
                  <GameCard
                    key={card.id}
                    card={card}
                    onClick={() => handleCardClick(card.id)}
                    disabled={gameState.phase === "game_over" || (isMyTurn && !isSpymaster && !gameState.currentClue)}
                    isSpymaster={showSpymasterView}
                    isSelected={selectedCardId === card.id} 
                    targetingPlayers={targetingTeammates}
                  />
                )
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR: RED TEAM */}
          <div className={`${styles.sidePanel} ${styles.redPanel} ${gameState.turn === 'red' ? styles.panelActive : ''}`}>
             <div className={`${styles.progressContainer} ${gameState.turn === 'red' ? styles.scoreActive : styles.scoreInactive}`}>
              <div className={styles.scoreRed}>RED: {gameState.scores.red}</div>
              <div className={styles.progressBar}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`${styles.progressSegment} ${i < (9 - gameState.scores.red) ? styles.segmentRedFilled : ''}`} />
                ))}
              </div>
            </div>
            <div className={styles.rosterSection}>
              <div className={styles.rosterTitle}>OPERATIVES</div>
              {redTeam.filter(p => p.role === ROLES.OPERATIVE).map(p => (
                <div key={p.id} className={styles.rosterPlayer}>{p.name} {p.id === socket?.id && "(YOU)"}</div>
              ))}
              <div className={styles.rosterTitle} style={{marginTop: '1rem'}}>SPYMASTER</div>
              {redTeam.filter(p => p.role === ROLES.SPYMASTER).map(p => (
                <div key={p.id} className={`${styles.rosterPlayer} ${styles.isSpymaster}`}>{p.name} {p.id === socket?.id && "(YOU)"}</div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM: CLUE CONSOLE */}
        <div className={styles.actionBar}>
          {gameState.timerDuration > 0 && gameState.phase === "playing" && (
            <div className={styles.timerDisplay}>
               TIME: {formatTime(timeLeft)}
            </div>
          )}

          {gameState.phase === "playing" && isMyTurn && isSpymaster && !gameState.currentClue && (
            <form onSubmit={submitClue} className={styles.clueForm}>
              {pendingClue ? (
                <div className={styles.confirmPanel}>
                  <div className={styles.pendingDisplay}>CONFIRM CLUE: {pendingClue.word} / {pendingClue.number === 99 ? '∞' : pendingClue.number}</div>
                  <button type="button" onClick={confirmClue} className={styles.confirmBtn}>TRANSMIT</button>
                  <button type="button" onClick={cancelClue} className={styles.cancelBtn}>ABORT</button>
                </div>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="TYPE CLUE WORD..." 
                    value={clueWord}
                    onChange={e => setClueWord(e.target.value.toUpperCase().trim())}
                    className={styles.clueInput}
                    autoFocus
                  />
                  <div className={styles.clueNumController}>
                    <button type="button" onClick={handleDecrement} className={styles.clueNumBtn}>-</button>
                    <span className={styles.clueNumValue}>{clueNum === "99" ? "∞" : clueNum}</span>
                    <button type="button" onClick={handleIncrement} className={styles.clueNumBtn}>+</button>
                  </div>
                  <button type="submit" className={styles.sendBtn}>PREPARE</button>
                </>
              )}
            </form>
          )}

          {gameState.phase === "playing" && isMyTurn && !isSpymaster && gameState.currentClue && (
            <div className={styles.activeCluePanel}>
              <div className={styles.clueDisplay}>
                <DecipherText text={gameState.currentClue.word} speed={20} /> <span style={{color: 'var(--text-muted)'}}>/</span> {gameState.currentClue.number === 99 ? '∞' : gameState.currentClue.number} 
              </div>
              <button onClick={endTurn} className={styles.endTurnBtn}>END TURN</button>
            </div>
          )}

          {gameState.phase === "playing" && (!isMyTurn || (!gameState.currentClue && !isSpymaster)) && (
            <div className={styles.waitingPanel}>
              <div style={{width: 10, height: 10, borderRadius: '50%', background: gameState.turn === 'red' ? 'var(--red-primary)' : 'var(--blue-primary)', animation: 'pulse 1s infinite'}} />
              <span style={{fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.1em'}}>
                <DecipherText text={`SECURE CHANNEL OPEN...`} speed={30} /> 
              </span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLayout}>
            <div className={styles.logPanel}>
              <div className={styles.panelHeader}>ACTION LOG</div>
              <div className={styles.logs}>
                {gameState.logs.slice().reverse().map((log, i) => (
                  <div key={i} className={styles.logEntry}>
                     {renderLogEntry(log, i === 0)} 
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.clueHistoryPanel}>
              <div className={styles.panelHeader}>CLUE HISTORY</div>
              <div className={styles.logs}>
                {clueHistory.slice().reverse().map((log, i) => (
                  <div key={i} className={styles.logEntry}>
                     {renderLogEntry(log, false)} 
                  </div>
                ))}
                {clueHistory.length === 0 && <div style={{opacity: 0.5, fontStyle: 'italic', fontSize: '0.8rem'}}>No clues transmitted.</div>}
              </div>
            </div>
          </div>

          <div className={styles.controls}>
             {!isSpymaster && (
               <button onClick={() => setViewAsSpymaster(!viewAsSpymaster)} className={styles.controlBtn}>
                 {viewAsSpymaster ? "HIDE CHEAT" : "VIEW CHEAT"}
               </button>
             )}
             {isHost && (
               <button onClick={handleRestart} className={styles.controlBtn} style={{borderColor: 'var(--red-dark)', color: 'var(--red-primary)'}}>
                 RESET
               </button>
             )}
             <button onClick={() => setCrtEnabled(!crtEnabled)} className={styles.controlBtn}>
               CRT: {crtEnabled ? "ON" : "OFF"}
             </button>
             <button onClick={leaveMission} className={styles.controlBtn}>
               ABORT
             </button>
          </div>
        </div>
      </div>
    </>
  );
}
