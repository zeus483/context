import fs from "fs";
import path from "path";

export type ContextPair = { id: string; a: string; b: string; tags?: string[] };
export type Prompt = { id: string; text: string; tone?: string };
export type Constraint = { id: string; text: string; severity?: string };

export type PackContent = {
  packId: string;
  contexts: ContextPair[];
  prompts: Prompt[];
  constraints: Constraint[];
};

export type ContentStore = {
  packs: Map<string, PackContent>;
  packIds: string[];
};

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolvePacksDir() {
  const cwd = path.join(process.cwd(), "content", "packs");
  if (fs.existsSync(cwd)) return cwd;
  const root = path.join(process.cwd(), "../../content/packs");
  if (fs.existsSync(root)) return root;
  return cwd;
}

export function loadContent(): ContentStore {
  const packsDir = resolvePacksDir();
  const packIds = fs.readdirSync(packsDir).filter((name) => fs.statSync(path.join(packsDir, name)).isDirectory());
  const packs = new Map<string, PackContent>();

  for (const packId of packIds) {
    const contextsPath = path.join(packsDir, packId, "contexts.json");
    const promptsPath = path.join(packsDir, packId, "prompts.json");
    const constraintsPath = path.join(packsDir, packId, "constraints.json");

    const contexts = readJson<{ pairs: ContextPair[] }>(contextsPath).pairs;
    const prompts = readJson<{ prompts: Prompt[] }>(promptsPath).prompts;
    const constraints = readJson<{ constraints: Constraint[] }>(constraintsPath).constraints;

    packs.set(packId, { packId, contexts, prompts, constraints });
  }

  return { packs, packIds };
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickRandomMany<T>(items: T[], count: number, rng = Math.random): T[] {
  const copy = [...items];
  const selected: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i += 1) {
    const idx = Math.floor(rng() * copy.length);
    selected.push(copy.splice(idx, 1)[0]);
  }
  return selected;
}

export function getPackOrRandom(store: ContentStore, packId?: string | null, allowedPackIds?: string[]) {
  const pool = allowedPackIds && allowedPackIds.length ? allowedPackIds : store.packIds;
  if (packId && store.packs.has(packId) && pool.includes(packId)) {
    return store.packs.get(packId)!;
  }
  return store.packs.get(pickRandom(pool))!;
}

export function getRandomContextPair(store: ContentStore, packId?: string | null, allowedPackIds?: string[]) {
  const pack = getPackOrRandom(store, packId, allowedPackIds);
  return pickRandom(pack.contexts);
}

export function getDailyContextPair(store: ContentStore, seed: string, packId?: string | null, allowedPackIds?: string[]) {
  const pack = getPackOrRandom(store, packId, allowedPackIds);
  const rng = mulberry32(seedFromString(seed));
  return pack.contexts[Math.floor(rng() * pack.contexts.length)];
}

export function getPrompts(store: ContentStore, packId?: string | null, count = 2, seed?: string, allowedPackIds?: string[]) {
  const pack = getPackOrRandom(store, packId, allowedPackIds);
  const rng = seed ? mulberry32(seedFromString(seed + "-prompts")) : Math.random;
  return pickRandomMany(pack.prompts, count, rng);
}

export function getConstraints(store: ContentStore, packId?: string | null, playerCount = 5, seed?: string, allowedPackIds?: string[]) {
  const pack = getPackOrRandom(store, packId, allowedPackIds);
  const rng = seed ? mulberry32(seedFromString(seed + "-constraints")) : Math.random;
  const selected = pickRandomMany(pack.constraints, playerCount, rng);
  return selected;
}
