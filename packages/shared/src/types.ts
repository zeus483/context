import type { Phase, RoomMode } from "./constants.js";

export type TimersConfig = {
  brief: number;
  prompt1: number;
  prompt2: number;
  discuss: number;
  vote: number;
  reveal: number;
};

export type RoomConfig = {
  mode: RoomMode;
  timers?: TimersConfig;
  packId?: string | null;
  streamMode?: boolean;
  allowTieElimination?: boolean;
  allowDoubleInfiltrator?: boolean;
};

export type PlayerInfo = {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isConnected: boolean;
  isAlive: boolean;
  score: number;
  userId?: string | null;
  guestId?: string | null;
};

export type RoomState = {
  roomCode: string;
  phase: Phase;
  phaseEndsAt?: number | null;
  config: RoomConfig;
  hostId: string;
  players: PlayerInfo[];
  currentRound: number;
  gameId?: string | null;
  roundId?: string | null;
  contexts?: { a: string; b: string } | null;
  prompts?: { id: string; text: string }[];
  constraints?: Record<string, string>;
  roles?: Record<string, "INFILTRATOR" | "NORMAL">;
  phaseNonce?: string | null;
};

export type HighlightSummary = {
  id: string;
  slug: string;
  title: string;
  quote: string;
  ogImageUrl?: string | null;
};
