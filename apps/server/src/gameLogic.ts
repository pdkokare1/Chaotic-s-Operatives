import { GameState, Card, TEAMS, CARD_TYPES, Team } from "@operative/shared";

// A larger dictionary for more replayability
const WORD_LIST = [
  "ENGINE", "HOTEL", "TOKYO", "KEY", "CODE", "AGENT", "SPACE", "DANCE",
  "APPLE", "GLASS", "SCREEN", "SOUND", "WAVE", "LIGHT", "ZERO", "GHOST",
  "TIME", "LINE", "WEB", "ROBOT", "IRON", "GOLD", "SILVER", "LEMON", "MOON",
  "NIGHT", "SKY", "STAR", "PLANET", "ROCK", "PAPER", "SCISSORS", "FIRE",
  "WATER", "WIND", "EARTH", "MAGIC", "LION", "TIGER", "BEAR", "SHARK"
];

export function generateGame(roomCode: string): GameState {
  // 1. Shuffle Words (Pick 25 random words)
  const shuffledWords = [...WORD_LIST]
    .sort(() => 0.5 - Math.random())
    .slice(0, 25);

  // 2. Assign Colors (9 Red, 8 Blue, 7 Neutral, 1 Assassin)
  const types = [
    ...Array(9).fill(CARD_TYPES.RED),
    ...Array(8).fill(CARD_TYPES.BLUE),
    ...Array(7).fill(CARD_TYPES.NEUTRAL),
    CARD_TYPES.ASSASSIN
  ].sort(() => 0.5 - Math.random());

  // 3. Build Board
  const board: Card[] = shuffledWords.map((word, index) => ({
    id: `card-${index}`,
    word,
    type: types[index],
    revealed: false 
  }));

  return {
    roomCode,
    phase: "playing",
    turn: TEAMS.RED,
    board,
    scores: { red: 9, blue: 8 }, // Counts down to 0
    winner: null,
    logs: ["Mission Started. Red Team, awaiting orders."]
  };
}

export function makeMove(gameState: GameState, cardId: string): GameState {
  // 1. Validation
  if (gameState.phase !== "playing") return gameState;
  
  const cardIndex = gameState.board.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return gameState;
  
  const card = gameState.board[cardIndex];
  if (card.revealed) return gameState; // Ignore if already clicked

  // 2. Reveal Card
  // We create a new board array to keep state immutable-ish
  const newBoard = [...gameState.board];
  newBoard[cardIndex] = { ...card, revealed: true };
  
  const newState = { ...gameState, board: newBoard, logs: [...gameState.logs] };
  const currentTeam = newState.turn;
  const opponentTeam = currentTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED;

  // 3. Apply Rules
  if (card.type === CARD_TYPES.ASSASSIN) {
    // RULE: Assassin clicked -> Instant Loss
    newState.phase = "game_over";
    newState.winner = opponentTeam;
    newState.logs.push(`FATAL ERROR: ${currentTeam.toUpperCase()} Hit the Assassin! ${opponentTeam.toUpperCase()} Wins.`);
  } 
  else if (card.type === CARD_TYPES.NEUTRAL) {
    // RULE: Neutral clicked -> Turn Ends
    newState.turn = opponentTeam;
    newState.logs.push(`${currentTeam.toUpperCase()} hit a civilian. Turn over.`);
  } 
  else if (card.type === currentTeam) {
    // RULE: Correct Guess -> Score -1, Turn Continues
    newState.scores[currentTeam] -= 1;
    newState.logs.push(`${currentTeam.toUpperCase()} found an Agent!`);

    // Win Check
    if (newState.scores[currentTeam] === 0) {
      newState.phase = "game_over";
      newState.winner = currentTeam;
      newState.logs.push(`MISSION ACCOMPLISHED: ${currentTeam.toUpperCase()} Wins!`);
    }
  } 
  else {
    // RULE: Opponent Card -> Turn Ends, Opponent Score -1
    newState.scores[opponentTeam] -= 1;
    newState.turn = opponentTeam;
    newState.logs.push(`${currentTeam.toUpperCase()} found an Enemy Spy! Turn over.`);

    // Win Check (Opponent might win if you click their last card)
    if (newState.scores[opponentTeam] === 0) {
      newState.phase = "game_over";
      newState.winner = opponentTeam;
      newState.logs.push(`MISSION FAILED: ${opponentTeam.toUpperCase()} Wins!`);
    }
  }

  return newState;
}
