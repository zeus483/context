export type Difficulty = "easy" | "medium" | "hard";

export type WordFlags = {
  ambiguous?: boolean;
};

export type CategoryWord = {
  word: string;
  difficulty: Difficulty;
  flags?: WordFlags;
};

export type Category = {
  id: string;
  name: string;
  words: CategoryWord[];
  custom?: boolean;
};

export type Role = "CIVIL" | "IMPOSTOR";

export type Player = {
  id: string;
  name: string;
  role: Role;
  revealed: boolean;
  eliminated: boolean;
  accusedCount: number;
};

export type GamePhase = "CONFIG" | "REVEAL" | "RUNNING" | "ENDED";

export type TieStrategy = "MINI_REVOTE" | "NO_ELIMINATION" | "RANDOM_TIED";

export type GamePreset = "QUICK" | "CLASSIC" | "LONG";

export type GameSettings = {
  playerCount: number;
  impostorCount: number;
  showCategoryToImpostor: boolean;
  durationSeconds: number;
  selectedCategoryIds: string[];
  difficulty: Difficulty;
  includeHardAmbiguous: boolean;
  tieStrategy: TieStrategy;
  timerCapMinutes: number;
  accessibleRevealMode: boolean;
  enableHaptics: boolean;
  enableFinalBeep: boolean;
  preset: GamePreset | null;
};

export type GameWinner = "GROUP" | "IMPOSTORS";

export type MiniRoundState = {
  active: boolean;
  tiedPlayerIds: string[];
  endsAt: number | null;
  attempt: number;
};

export type GameState = {
  phase: GamePhase;
  settings: GameSettings;
  playerNames: string[];
  players: Player[];
  category: Category | null;
  word: string | null;
  roundEndsAt: number | null;
  remainingSeconds: number;
  miniRound: MiniRoundState;
  winner: GameWinner | null;
  durationOverride: boolean;
  recentWords: string[];
  lastCategoryId: string | null;
};
