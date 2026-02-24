// packages/shared/src/index.ts
import { z } from "zod";

// --- Game Constants ---
export const TEAMS = {
  RED: "red",
  BLUE: "blue",
} as const;

export const CARD_TYPES = {
  RED: "red",
  BLUE: "blue",
  NEUTRAL: "neutral",
  ASSASSIN: "assassin",
} as const;

export const ROLES = {
  SPYMASTER: "spymaster",
  OPERATIVE: "operative",
} as const;

// --- Types ---
export type Team = (typeof TEAMS)[keyof typeof TEAMS];
export type CardType = (typeof CARD_TYPES)[keyof typeof CARD_TYPES];
export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface Player {
  id: string;
  name: string;
  team: Team;
  role: Role;
  deviceId?: string; 
  currentTarget?: string | null; 
}

export interface Card {
  id: string;
  word: string;
  type: CardType;
  revealed: boolean;
}

export interface Clue {
  word: string;
  number: number;
}

export interface GameState {
  roomCode: string;
  phase: "lobby" | "playing" | "game_over";
  mode: "standard" | "blacksite"; 
  theme: "dark" | "glass"; 
  turn: Team;
  lastStarter: Team | null; 
  board: Card[];
  players: Player[];
  scores: { red: number; blue: number };
  winner: Team | null;
  logs: string[];
  currentClue: Clue | null;
  timerDuration: number;
  turnEndsAt: number | null; 
  cardsRevealedThisTurn: number; 
}

// --- Validation Schemas ---
export const CreateGameSchema = z.object({
  hostName: z.string().min(1),
});

export const JoinGameSchema = z.object({
  roomCode: z.string().length(4),
  playerName: z.string().min(1),
});
