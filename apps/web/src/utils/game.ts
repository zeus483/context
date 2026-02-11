import type { Category, Difficulty, Player } from "../types";

export function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function pickRandom<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick random item from empty array");
  }
  return items[Math.floor(Math.random() * items.length)];
}

export function computeRecommendedTimeMinutes(
  playerCount: number,
  impostorCount: number,
  timerCapMinutes = 12
): number {
  const base = Math.max(5, Math.ceil(playerCount * 0.75));
  const extra = Math.max(0, impostorCount - 1);
  const recommended = base + extra;
  return Math.min(timerCapMinutes, recommended);
}

export function difficultyMatchesWord(
  selected: Difficulty,
  wordDifficulty: Difficulty,
  includeHardAmbiguous: boolean
): boolean {
  if (selected === wordDifficulty) return true;
  if (includeHardAmbiguous && wordDifficulty === "hard") return true;
  return false;
}

export function validateConfig(input: {
  playerCount: number;
  impostorCount: number;
  playerNames: string[];
  selectedCategoryIds: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { playerCount, impostorCount, playerNames, selectedCategoryIds } = input;

  if (playerCount < 1 || playerCount > 20) {
    errors.push("El número de jugadores debe estar entre 1 y 20.");
  }

  const maxImpostors = Math.max(1, Math.floor(playerCount / 2));
  if (impostorCount < 1 || impostorCount > maxImpostors) {
    errors.push(`Los impostores deben estar entre 1 y ${maxImpostors}.`);
  }

  if (selectedCategoryIds.length === 0) {
    errors.push("Selecciona al menos una categoría.");
  }

  return { valid: errors.length === 0, errors };
}

export function normalizePlayerNames(names: string[], playerCount: number): string[] {
  const baseNames = Array.from({ length: playerCount }, (_, index) => {
    const raw = names[index] ?? "";
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : `Jugador ${index + 1}`;
  });

  const counts = new Map<string, number>();
  return baseNames.map((name) => {
    const current = counts.get(name) ?? 0;
    counts.set(name, current + 1);
    if (current === 0) {
      return name;
    }
    return `${name} ${current + 1}`;
  });
}

export function createPlayers(names: string[], impostorCount: number): Player[] {
  const ids = names.map((_, index) => `p${index + 1}`);
  const shuffled = shuffle(ids);
  const impostorSet = new Set(shuffled.slice(0, impostorCount));

  return names.map((name, index) => ({
    id: ids[index],
    name,
    role: impostorSet.has(ids[index]) ? "IMPOSTOR" : "CIVIL",
    revealed: false,
    eliminated: false,
    accusedCount: 0
  }));
}

export function tallyVotes(ballots: Record<string, string>): {
  counts: Record<string, number>;
  maxVotes: number;
  winners: string[];
} {
  const counts: Record<string, number> = {};
  for (const targetId of Object.values(ballots)) {
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }

  let maxVotes = 0;
  const winners: string[] = [];

  Object.entries(counts).forEach(([playerId, votes]) => {
    if (votes > maxVotes) {
      maxVotes = votes;
      winners.length = 0;
      winners.push(playerId);
      return;
    }
    if (votes === maxVotes) {
      winners.push(playerId);
    }
  });

  return { counts, maxVotes, winners };
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function getCategoryById(categories: Category[], id: string): Category | undefined {
  return categories.find((category) => category.id === id);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .trim();
}
