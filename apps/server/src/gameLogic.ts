// apps/server/src/gameLogic.ts
import { GameState, Card, TEAMS, CARD_TYPES, Player, Team, ROLES, CardType } from "@operative/shared";
import { WORD_LIST, CATEGORIZED_WORDS } from "./words";

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
    mode: "standard",
    theme: "dark", 
    turn: TEAMS.RED,
    lastStarter: null,
    board,
    players: [],
    scores: { red: 9, blue: 8 },
    winner: null,
    logs: ["Waiting for players..."],
    currentClue: null,
    timerDuration: 0, 
    turnEndsAt: null,
    cardsRevealedThisTurn: 0 
  };
}

export function addPlayer(gameState: GameState, id: string, name: string, deviceId?: string): GameState {
  const redCount = gameState.players.filter(p => p.team === TEAMS.RED).length;
  const blueCount = gameState.players.filter(p => p.team === TEAMS.BLUE).length;
  const team = redCount <= blueCount ? TEAMS.RED : TEAMS.BLUE;

  const newPlayer: Player = {
    id,
    name,
    team,
    role: ROLES.OPERATIVE,
    deviceId 
  };

  return { ...gameState, players: [...gameState.players, newPlayer] };
}

export function removePlayer(gameState: GameState, id: string): GameState {
  return { ...gameState, players: gameState.players.filter(p => p.id !== id) };
}

export function updatePlayer(gameState: GameState, id: string, updates: Partial<Player>): GameState {
  return { ...gameState, players: gameState.players.map(p => p.id === id ? { ...p, ...updates } : p) };
}

export function startGame(gameState: GameState, options?: { category: string, timer: number, mode?: "standard" | "blacksite", theme?: "dark" | "glass" | "matrix" | "radar" | "hardware" }): GameState {
  if (gameState.phase !== "lobby") return gameState;

  const newMode = options?.mode || "standard";
  const newTheme = options?.theme || "dark";
  const startingTeam = gameState.lastStarter === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;

  let selectedTimer = options?.timer || 0;
  let newTurnEndsAt = selectedTimer > 0 ? Date.now() + (selectedTimer * 1000) : null;

  let pool = WORD_LIST;
  if (options?.category && CATEGORIZED_WORDS[options.category]) {
    pool = CATEGORIZED_WORDS[options.category];
    if (pool.length < 25) pool = WORD_LIST; 
  }
  const shuffledWords = [...pool].sort(() => 0.5 - Math.random()).slice(0, 25);

  let types: CardType[] = [];
  
  if (newMode === "blacksite") {
    types = [
      ...Array(9).fill(startingTeam),
      ...Array(8).fill(startingTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED),
      ...Array(5).fill(CARD_TYPES.NEUTRAL),
      ...Array(3).fill(CARD_TYPES.ASSASSIN)
    ];
  } else {
    types = [
      ...Array(9).fill(startingTeam),
      ...Array(8).fill(startingTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED),
      ...Array(7).fill(CARD_TYPES.NEUTRAL),
      CARD_TYPES.ASSASSIN
    ];
  }
  types.sort(() => 0.5 - Math.random());

  const newBoard = gameState.board.map((card, index) => ({
    ...card,
    word: shuffledWords[index] || "BLANK",
    type: types[index],
    revealed: false
  }));

  return {
    ...gameState,
    phase: "playing",
    turn: startingTeam,
    lastStarter: startingTeam,
    mode: newMode,
    theme: newTheme,
    board: newBoard,
    scores: { red: startingTeam === TEAMS.RED ? 9 : 8, blue: startingTeam === TEAMS.BLUE ? 9 : 8 },
    timerDuration: selectedTimer,
    turnEndsAt: newTurnEndsAt,
    cardsRevealedThisTurn: 0,
    logs: [...gameState.logs, `Mission Started. ${newMode.toUpperCase()} Protocol. ${startingTeam.toUpperCase()} Team, awaiting orders.`]
  };
}

export function giveClue(gameState: GameState, word: string, number: number): GameState {
  if (gameState.phase !== "playing") return gameState;
  
  let newTurnEndsAt = gameState.turnEndsAt;
  if (gameState.mode === "standard" && gameState.timerDuration > 0) {
    newTurnEndsAt = Date.now() + (gameState.timerDuration * 1000);
  }

  return {
    ...gameState,
    currentClue: { word, number },
    turnEndsAt: newTurnEndsAt,
    logs: [...gameState.logs, `${gameState.turn.toUpperCase()} Spymaster: ${word} (${number === 99 ? '∞' : number})`]
  };
}

export function endTurn(gameState: GameState): GameState {
  if (gameState.phase !== "playing") return gameState;
  
  const opponent = gameState.turn === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;
  
  return {
    ...gameState,
    turn: opponent,
    currentClue: null, 
    cardsRevealedThisTurn: 0, 
    turnEndsAt: gameState.timerDuration > 0 ? Date.now() + (gameState.timerDuration * 1000) : null,
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
  newState.cardsRevealedThisTurn += 1; 

  const currentTeam = newState.turn;
  const opponentTeam = currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;

  if (card.type === CARD_TYPES.ASSASSIN) {
    newState.phase = "game_over";
    newState.winner = opponentTeam;
    newState.turnEndsAt = null;
    newState.logs.push(`FATAL ERROR: ${currentTeam.toUpperCase()} Hit the Assassin! ${opponentTeam.toUpperCase()} Wins.`);
  } 
  else if (card.type === CARD_TYPES.NEUTRAL) {
    newState.turn = opponentTeam;
    newState.currentClue = null; 
    newState.cardsRevealedThisTurn = 0; 
    newState.turnEndsAt = newState.timerDuration > 0 ? Date.now() + (newState.timerDuration * 1000) : null;
    newState.logs.push(`${currentTeam.toUpperCase()} hit a civilian. Turn over.`);
  } 
  else if (card.type === currentTeam) {
    newState.scores[currentTeam] -= 1;
    newState.logs.push(`${currentTeam.toUpperCase()} found an Agent!`);

    if (newState.scores[currentTeam] === 0) {
      newState.phase = "game_over";
      newState.winner = currentTeam;
      newState.turnEndsAt = null;
      newState.logs.push(`MISSION ACCOMPLISHED: ${currentTeam.toUpperCase()} Wins!`);
    }
  } 
  else {
    newState.scores[opponentTeam] -= 1;
    newState.turn = opponentTeam;
    newState.currentClue = null; 
    newState.cardsRevealedThisTurn = 0; 
    newState.turnEndsAt = newState.timerDuration > 0 ? Date.now() + (newState.timerDuration * 1000) : null;
    newState.logs.push(`${currentTeam.toUpperCase()} found an Enemy Spy! Turn over.`);

    if (newState.scores[opponentTeam] === 0) {
      newState.phase = "game_over";
      newState.winner = opponentTeam;
      newState.turnEndsAt = null;
      newState.logs.push(`MISSION FAILED: ${opponentTeam.toUpperCase()} Wins!`);
    }
  }

  return newState;
}
