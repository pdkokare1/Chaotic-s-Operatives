import { GameState, Card, TEAMS, CARD_TYPES } from "@operative/shared";

// A small list for testing. We will add a huge dictionary later.
const WORD_LIST = [
  "ENGINE", "HOTEL", "TOKYO", "KEY", "CODE", "AGENT", "SPACE", "DANCE",
  "APPLE", "GLASS", "SCREEN", "SOUND", "WAVE", "LIGHT", "ZERO", "GHOST",
  "TIME", "LINE", "WEB", "ROBOT", "IRON", "GOLD", "SILVER", "LEMON", "MOON"
];

export function generateGame(roomCode: string): GameState {
  // 1. Shuffle Words
  const shuffledWords = [...WORD_LIST].sort(() => 0.5 - Math.random()).slice(0, 25);

  // 2. Assign Colors (9 Red, 8 Blue, 7 Neutral, 1 Assassin)
  // We default Red to start (9 cards)
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
    revealed: false // All cards start hidden
  }));

  return {
    roomCode,
    phase: "playing",
    turn: TEAMS.RED,
    board,
    scores: { red: 9, blue: 8 },
    winner: null,
    logs: ["Game Started! Red Team's Turn."]
  };
}
