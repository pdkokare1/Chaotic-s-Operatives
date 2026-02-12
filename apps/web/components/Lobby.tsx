"use client";

import { GameState, Player, TEAMS, ROLES } from "@operative/shared";
import { useSocket } from "../context/SocketContext";
import styles from "./Lobby.module.css";

interface LobbyProps {
  gameState: GameState;
  currentPlayerId?: string;
}

export default function Lobby({ gameState, currentPlayerId }: LobbyProps) {
  const { socket } = useSocket();

  const redTeam = gameState.players.filter(p => p.team === TEAMS.RED);
  const blueTeam = gameState.players.filter(p => p.team === TEAMS.BLUE);
  const isHost = gameState.players[0]?.id === currentPlayerId;

  const switchTeam = (team: string) => { socket?.emit("change_team", team); };
  const switchRole = (role: string) => { socket?.emit("change_role", role); };
  const startGame = () => { socket?.emit("start_game"); };

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <h2 className={styles.title}>MISSION LOBBY</h2>
        <div className={styles.codeBadge}>
          <span className={styles.codeLabel}>ROOM CODE:</span>
          <span className={styles.codeValue}>{gameState.roomCode}</span>
        </div>
      </div>

      <div className={styles.teamsGrid}>
        {/* --- RED TEAM --- */}
        <div className={`${styles.teamPanel} ${styles.redPanel}`}>
          <button onClick={() => switchTeam(TEAMS.RED)} className={`${styles.joinButton} ${styles.joinRed}`}>
            JOIN RED TEAM
          </button>
          <div className={styles.playerList}>
            {redTeam.map(player => (
              <PlayerCard key={player.id} player={player} isMe={player.id === currentPlayerId} onRoleSwitch={switchRole} />
            ))}
            {redTeam.length === 0 && <div className={styles.emptyState}>No Agents</div>}
          </div>
        </div>

        {/* --- BLUE TEAM --- */}
        <div className={`${styles.teamPanel} ${styles.bluePanel}`}>
          <button onClick={() => switchTeam(TEAMS.BLUE)} className={`${styles.joinButton} ${styles.joinBlue}`}>
            JOIN BLUE TEAM
          </button>
          <div className={styles.playerList}>
            {blueTeam.map(player => (
              <PlayerCard key={player.id} player={player} isMe={player.id === currentPlayerId} onRoleSwitch={switchRole} />
            ))}
            {blueTeam.length === 0 && <div className={styles.emptyState}>No Agents</div>}
          </div>
        </div>
      </div>

      {isHost ? (
        <button onClick={startGame} className={styles.startButton}>START MISSION</button>
      ) : (
        <div className="animate-pulse" style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>
          WAITING FOR HOST TO START...
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, isMe, onRoleSwitch }: { player: Player, isMe: boolean, onRoleSwitch: (r: string) => void }) {
  const isSpy = player.role === ROLES.SPYMASTER;
  return (
    <div className={`${styles.playerCard} ${isMe ? styles.isMe : ""}`}>
      <div className={styles.playerInfo}>
        <div className={`${styles.roleDot} ${isSpy ? styles.isSpymaster : ""} ${isSpy ? "animate-pulse" : ""}`} />
        <span className={`${styles.playerName} ${isMe ? styles.nameActive : ""}`}>
          {player.name} {isMe && "(YOU)"}
        </span>
      </div>

      {isMe ? (
        <div className={styles.roleToggle}>
          <button 
            onClick={() => onRoleSwitch(ROLES.OPERATIVE)}
            className={`${styles.roleBtn} ${!isSpy ? styles.roleBtnActive : ""}`}
          >OP</button>
          <button 
            onClick={() => onRoleSwitch(ROLES.SPYMASTER)}
            className={`${styles.roleBtn} ${isSpy ? styles.spyActive : ""}`}
          >SPY</button>
        </div>
      ) : (
        <span style={{fontSize: '10px', fontFamily: 'monospace', color: '#525252'}}>
          {isSpy ? "SPYMASTER" : "OPERATIVE"}
        </span>
      )}
    </div>
  );
}
