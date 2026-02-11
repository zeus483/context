export const Phases = {
  LOBBY: "LOBBY",
  BRIEF: "BRIEF",
  PROMPT1: "PROMPT1",
  PROMPT2: "PROMPT2",
  DISCUSS: "DISCUSS",
  VOTE: "VOTE",
  REVEAL: "REVEAL",
  END: "END"
} as const;

export type Phase = (typeof Phases)[keyof typeof Phases];

export const DEFAULT_TIMERS = {
  brief: 8,
  prompt1: 25,
  prompt2: 25,
  discuss: 75,
  vote: 15,
  reveal: 12
} as const;

export type RoomMode = "quick" | "standard" | "stream";

export const MODE_ROUNDS_TO_WIN: Record<RoomMode, number> = {
  quick: 2,
  standard: 3,
  stream: 3
};

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 3;
