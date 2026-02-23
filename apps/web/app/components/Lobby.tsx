// apps/web/app/components/Lobby.tsx
"use client";

import { useState, useEffect } from "react";
import { GameState, Player, TEAMS, ROLES } from "@operative/shared";
import { useSocket } from "../../context/SocketContext";
import DecipherText from "./DecipherText"; 
import styles from "./Lobby.module.css";

interface LobbyProps {
  gameState: GameState;
  currentPlayerId?: string;
}

export default function Lobby({ gameState, currentPlayerId }: LobbyProps) {
  const { socket } = useSocket();

  const [selectedCategory, setSelectedCategory] = useState("Standard Mix");
  const [selectedTimer, setSelectedTimer] = useState(0);
  const [selectedMode, setSelectedMode] = useState("standard"); 

  const [localPlayers, setLocalPlayers] = useState(gameState.players);

  useEffect(() => {
    setLocalPlayers(gameState.players);
  }, [gameState.players]);

  const redTeam = localPlayers.filter(p => p.team === TEAMS.RED);
  const blueTeam = localPlayers.filter(p => p.team === TEAMS.BLUE);
  const isHost = localPlayers[0]?.id === currentPlayerId;

  const switchTeam = (team: string) => { 
    if (currentPlayerId) {
      setLocalPlayers(prev => prev.map(p => 
        p.id === currentPlayerId ? { ...p, team: team as typeof TEAMS.RED | typeof TEAMS.BLUE, role: ROLES.OPERATIVE } : p
      ));
    }
    socket?.emit("change_team", team); 
  };
  
  const switchRole = (role: string) => { 
    if (currentPlayerId) {
      setLocalPlayers(prev => prev.map(p => 
        p.id === currentPlayerId ? { ...p, role: role as typeof ROLES.OPERATIVE | typeof ROLES.SPYMASTER } : p
      ));
    }
    socket?.emit("change_role", role); 
  };
  
  const startGame = () => { socket?.emit("start_game", { category: selectedCategory, timer: selectedTimer, mode: selectedMode }); };

  const leaveMission = () => {
    if (confirm("Are you sure you want to leave this mission?")) {
      socket?.emit("leave_game");
      window.location.reload(); 
    }
  };

  return (
    <>
      <div className="crt-overlay" /> 
      <div className={styles.container}>
        
        <div className={styles.header}>
          <h2 className={styles.title}>
            <DecipherText text="MISSION LOBBY" /> 
          </h2>
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
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  isMe={player.id === currentPlayerId} 
                  onRoleSwitch={switchRole} 
                  isHost={player.id === localPlayers[0]?.id} 
                />
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
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  isMe={player.id === currentPlayerId} 
                  onRoleSwitch={switchRole} 
                  isHost={player.id === localPlayers[0]?.id} 
                />
              ))}
              {blueTeam.length === 0 && <div className={styles.emptyState}>No Agents</div>}
            </div>
          </div>
        </div>

        {isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.spyDropdown}
            >
              <option value="Standard Mix">Standard Mix</option>
              <option value="Spy & Action">Spy & Action</option>
              <option value="Places & Nature">Places & Nature</option>
              <option value="Objects & Food">Objects & Food</option>
              <option value="Characters & Myths">Characters & Myths</option>
            </select>

            <select 
              value={selectedTimer} 
              onChange={(e) => setSelectedTimer(Number(e.target.value))}
              className={styles.spyDropdown}
            >
              <option value={0}>Timer: Off</option>
              <option value={60}>Timer: 60 Seconds</option>
              <option value={90}>Timer: 90 Seconds</option>
              <option value={120}>Timer: 120 Seconds</option>
            </select>

            <select 
              value={selectedMode} 
              onChange={(e) => setSelectedMode(e.target.value)}
              className={styles.spyDropdown}
            >
              <option value="standard">Standard Operation</option>
              <option value="blacksite">Blacksite Protocol</option>
            </select>

            <button onClick={startGame} className={styles.startButton}>START MISSION</button>
          </div>
        ) : (
          <div style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>
            <DecipherText text="WAITING FOR HOST TO START..." /> 
          </div>
        )}

        <button 
          onClick={leaveMission} 
          style={{marginTop: '2rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '4px', fontSize: '0.8rem', letterSpacing: '0.1em'}}
        >
          LEAVE MISSION
        </button>
      </div>
    </>
  );
}

function PlayerCard({ player, isMe, onRoleSwitch, isHost }: { player: Player, isMe: boolean, onRoleSwitch: (r: string) => void, isHost: boolean }) {
  const [localRole, setLocalRole] = useState(player.role);
  
  useEffect(() => {
    setLocalRole(player.role);
  }, [player.role]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setLocalRole(newRole as typeof ROLES.OPERATIVE | typeof ROLES.SPYMASTER); 
    onRoleSwitch(newRole); 
  };

  const isSpy = localRole === ROLES.SPYMASTER;

  return (
    <div className={`${styles.playerCard} ${isMe ? styles.isMe : ""}`}>
      <div className={styles.playerInfo}>
        <div className={`${styles.roleDot} ${isSpy ? styles.isSpymaster : ""} ${isSpy ? "animate-pulse" : ""}`} />
        <span className={`${styles.playerName} ${isMe ? styles.nameActive : ""}`}>
          {isHost && "👑 "} {player.name} {isMe && "(YOU)"}
        </span>
      </div>

      {isMe ? (
        <select 
          value={localRole}
          onChange={handleRoleChange}
          className={styles.roleDropdown}
        >
          <option value={ROLES.OPERATIVE}>OPERATIVE</option>
          <option value={ROLES.SPYMASTER}>SPYMASTER</option>
        </select>
      ) : (
        <span style={{fontSize: '10px', fontFamily: 'monospace', color: '#525252'}}>
          {isSpy ? "SPYMASTER" : "OPERATIVE"}
        </span>
      )}
    </div>
  );
}
