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

// Visual 4: Static Hex Data for the Encrypted Columns
const hexString = Array.from({ length: 80 })
  .map((_, i) => `0x${(i * 13749).toString(16).toUpperCase().padStart(4, '0')} ... ERR // ${Math.random().toString(36).substring(2, 6).toUpperCase()}`)
  .join('\n');

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
  const showSpymasterView = isSpymaster; 

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
    setPendingClue({ 
      word: clueWord.toUpperCase().trim(), 
      number: gameState.mode === "blacksite" ? 99 : parseInt(clueNum) 
    });
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

  const renderLogEntry = (log: string, isNewest: boolean, isHistory: boolean = false) => {
    let displayText = log;
    if (isHistory && gameState.mode === "blacksite" && !isNewest) {
      displayText = log.replace(/(Spymaster:\s)([A-Z0-9\-]+)(\s\()/, "$1[REDACTED]$3");
    }

    const LogText = ({ text, color }: { text: string, color?: string }) => (
      <span style={{ color }}>{isNewest ? <TypewriterText text={text} speed={25} /> : text}</span>
    );

    if (displayText.includes("FATAL ERROR")) return <><span className={styles.tagFatal}>FATAL</span> <LogText text={displayText.replace("FATAL ERROR: ", "")} color="var(--red-primary)" /></>;
    if (displayText.includes("civilian")) return <><span className={styles.tagWarn}>INTEL</span> <LogText text={displayText} color="var(--yellow-accent)" /></>;
    if (displayText.startsWith("RED") || displayText.includes("Red Team")) return <><span className={styles.tagRed}>RED</span> <LogText text={displayText.replace(/^RED\s/, "")} /></>;
    if (displayText.startsWith("BLUE") || displayText.includes("Blue Team")) return <><span className={styles.tagBlue}>BLUE</span> <LogText text={displayText.replace(/^BLUE\s/, "")} /></>;
    if (displayText.includes("MISSION") || displayText.includes("SYSTEM")) return <><span className={styles.tagSystem}>SYSTEM</span> <LogText text={displayText.replace("SYSTEM OVERRIDE: ", "")} /></>;
    
    return <><span className={styles.tagSystem}>INFO</span> <LogText text={displayText} /></>;
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

  const showActionBar = gameState.phase === "playing" && isMyTurn && ((isSpymaster && !gameState.currentClue) || (!isSpymaster && gameState.currentClue));

  return (
    <>
      {crtEnabled && <div className="crt-overlay" />} 
      
      {/* Visual 2: Animated Radar Sweep */}
      {gameState.theme === 'radar' && <div className={styles.radarSweep} />}

      {/* Visual 3: Deep Vignette Shadow */}
      {(gameState.theme === 'radar' || gameState.theme === 'hardware') && <div className={styles.vignetteOverlay} />}

      {/* Visual 4: Encrypted Data Columns */}
      {gameState.theme === 'matrix' && (
        <>
          <div className={`${styles.dataColumn} ${styles.leftColumn}`}>{hexString}</div>
          <div className={`${styles.dataColumn} ${styles.rightColumn}`}>{hexString}</div>
        </>
      )}

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
          <div className={styles.headerBadges}>
            {gameState.timerDuration > 0 && gameState.phase === "playing" && (
              <div className={styles.timerDisplay}>
                 <span className={styles.timerLabel}>TIME</span>
                 <span className={styles.timerValue}>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button onClick={copyCode} className={styles.roomCodeDisplay}>
              <span className={styles.roomCodeLabel}>{copied ? "COPIED!" : "ROOM CODE"}</span>
              <span className={styles.roomCodeBox}>{gameState.roomCode}</span>
            </button>
          </div>
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

          {/* CENTER: GRID WITH HARDWARE FRAME */}
          <div className={styles.gridCenter}>
            {/* Visual 1: Hardware Sockets & Reticles */}
            <div className={gameState.theme === 'hardware' ? styles.hardwareFrame : ''}>
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

        {/* BOTTOM: CONDITIONAL CLUE CONSOLE */}
        {showActionBar && (
          <div className={styles.actionBar}>
            {isSpymaster && !gameState.currentClue ? (
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
                      maxLength={10} 
                      onChange={e => setClueWord(e.target.value.toUpperCase().trim())}
                      className={styles.clueInput}
                      autoFocus
                    />
                    
                    {gameState.mode !== "blacksite" ? (
                      <div className={styles.clueNumController}>
                        <button type="button" onClick={handleDecrement} className={styles.clueNumBtn}>-</button>
                        <span className={styles.clueNumValue}>{clueNum === "99" ? "∞" : clueNum}</span>
                        <button type="button" onClick={handleIncrement} className={styles.clueNumBtn}>+</button>
                      </div>
                    ) : (
                      <div className={styles.clueNumController} style={{justifyContent: 'center', background: 'var(--red-dark)', borderColor: 'var(--red-primary)'}}>
                        <span className={styles.clueNumValue} style={{color: 'white'}}>∞</span>
                      </div>
                    )}
                    
                    <button type="submit" className={styles.sendBtn}>PREPARE</button>
                  </>
                )}
              </form>
            ) : (
              <div className={styles.activeCluePanel}>
                <div className={styles.clueDisplay}>
                  <DecipherText text={gameState.currentClue!.word} speed={20} /> <span style={{color: 'var(--text-muted)'}}>/</span> {gameState.currentClue!.number === 99 ? '∞' : gameState.currentClue!.number} 
                </div>
                <button 
                  onClick={endTurn} 
                  className={styles.endTurnBtn}
                  disabled={gameState.mode === 'blacksite' && gameState.cardsRevealedThisTurn === 0}
                >
                  {gameState.mode === 'blacksite' && gameState.cardsRevealedThisTurn === 0 ? "NO RETREAT" : "END TURN"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.footer} style={{ marginTop: showActionBar ? '0' : '1.5rem' }}>
          <div className={styles.footerLayout}>
            <div className={styles.logPanel}>
              <div className={styles.panelHeader}>ACTION LOG</div>
              <div className={styles.logs}>
                {gameState.logs.slice().reverse().map((log, i) => (
                  <div key={i} className={styles.logEntry}>
                     {renderLogEntry(log, i === 0, false)} 
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.clueHistoryPanel}>
              <div className={styles.panelHeader}>CLUE HISTORY</div>
              <div className={styles.logs}>
                {clueHistory.slice().reverse().map((log, i) => (
                  <div key={i} className={styles.logEntry}>
                     {renderLogEntry(log, false, true)} 
                  </div>
                ))}
                {clueHistory.length === 0 && <div style={{opacity: 0.5, fontStyle: 'italic', fontSize: '0.8rem'}}>No clues transmitted.</div>}
              </div>
            </div>
          </div>

          <div className={styles.controls}>
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
