// apps/server/src/gameLogic.ts
import { GameState, Card, TEAMS, CARD_TYPES, Player, Team, ROLES } from "@operative/shared";
import { WORD_LIST } from "./words";

export function generateGame(roomCode: string): GameState {
  const shuffledWords = [...WORD_LIST]
    .sort(() => 0.5 - Math.random())
    .slice(0, 25);

  const types = [
    ...Array(9).fill(CARD_TYPES.RED),
    ...Array(8).fill(CARD_TYPES.BLUE),
    ...Array(7).fill(CARD_TYPES.NEUTRAL),
    CARD_TYPES.ASSASSIN
  ].sort(() => 0.5 - Math.random());

  const board: Card[] = shuffledWords.map((word, index) => ({
    id: `card-${index}`,
    word,
    type: types[index],
    revealed: false 
  }));

  return {
    roomCode,
    phase: "lobby",
    turn: TEAMS.RED,
    board,
    players: [],
    scores: { red: 9, blue: 8 },
    winner: null,
    logs: ["Waiting for players..."],
    currentClue: null // Start with no clue
  };
}

// --- Player Management ---
// Added deviceId parameter for reconnection tracking
export function addPlayer(gameState: GameState, id: string, name: string, deviceId?: string): GameState {
  const redCount = gameState.players.filter(p => p.team === TEAMS.RED).length;
  const blueCount = gameState.players.filter(p => p.team === TEAMS.BLUE).length;
  const team = redCount <= blueCount ? TEAMS.RED : TEAMS.BLUE;

  const newPlayer: Player = {
    id,
    name,
    team,
    role: ROLES.OPERATIVE,
    deviceId // Now included in state
  };

  return { ...gameState, players: [...gameState.players, newPlayer] };
}

export function removePlayer(gameState: GameState, id: string): GameState {
  return { ...gameState, players: gameState.players.filter(p => p.id !== id) };
}

export function updatePlayer(gameState: GameState, id: string, updates: Partial<Player>): GameState {
  return { ...gameState, players: gameState.players.map(p => p.id === id ? { ...p, ...updates } : p) };
}

export function startGame(gameState: GameState): GameState {
  if (gameState.phase !== "lobby") return gameState;
  return {
    ...gameState,
    phase: "playing",
    logs: [...gameState.logs, "Mission Started. Red Team, awaiting orders."]
  };
}

// --- Gameplay Logic ---

export function giveClue(gameState: GameState, word: string, number: number): GameState {
  if (gameState.phase !== "playing") return gameState;
  
  return {
    ...gameState,
    currentClue: { word, number },
    logs: [...gameState.logs, `${gameState.turn.toUpperCase()} Spymaster: ${word} (${number})`]
  };
}

export function endTurn(gameState: GameState): GameState {
  if (gameState.phase !== "playing") return gameState;
  
  const opponent = gameState.turn === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
  
  return {
    ...gameState,
    turn: opponent,
    currentClue: null, // Clear clue on turn switch
    logs: [...gameState.logs, `${gameState.turn.toUpperCase()} ended their turn.`]
  };
}

export function makeMove(gameState: GameState, cardId: string): GameState {
  if (gameState.phase !== "playing") return gameState;
  
  const cardIndex = gameState.board.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return gameState;
  
  const card = gameState.board[cardIndex];
  if (card.revealed) return gameState; 

  const newBoard = [...gameState.board];
  newBoard[cardIndex] = { ...card, revealed: true };
  
  const newState = { ...gameState, board: newBoard, logs: [...gameState.logs] };
  const currentTeam = newState.turn;
  const opponentTeam = currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;

  // Rule Application
  if (card.type === CARD_TYPES.ASSASSIN) {
    newState.phase = "game_over";
    newState.winner = opponentTeam;
    newState.logs.push(`FATAL ERROR: ${currentTeam.toUpperCase()} Hit the Assassin! ${opponentTeam.toUpperCase()} Wins.`);
  } 
  else if (card.type === CARD_TYPES.NEUTRAL) {
    newState.turn = opponentTeam;
    newState.currentClue = null; // Clear clue
    newState.logs.push(`${currentTeam.toUpperCase()} hit a civilian. Turn over.`);
  } 
  else if (card.type === currentTeam) {
    newState.scores[currentTeam] -= 1;
    newState.logs.push(`${currentTeam.toUpperCase()} found an Agent!`);

    if (newState.scores[currentTeam] === 0) {
      newState.phase = "game_over";
      newState.winner = currentTeam;
      newState.logs.push(`MISSION ACCOMPLISHED: ${currentTeam.toUpperCase()} Wins!`);
    }
  } 
  else {
    newState.scores[opponentTeam] -= 1;
    newState.turn = opponentTeam;
    newState.currentClue = null; // Clear clue
    newState.logs.push(`${currentTeam.toUpperCase()} found an Enemy Spy! Turn over.`);

    if (newState.scores[opponentTeam] === 0) {
      newState.phase = "game_over";
      newState.winner = opponentTeam;
      newState.logs.push(`MISSION FAILED: ${opponentTeam.toUpperCase()} Wins!`);
    }
  }

  return newState;
}
