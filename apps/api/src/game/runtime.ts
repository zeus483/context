import type { RoomState } from "@cc/shared";
import { redis } from "../redis";

export type RuntimeData = {
  roomId: string;
  state: RoomState;
  answers: Record<string, Record<string, string>>;
  votes: Record<string, string>;
  chat: { id: string; authorId: string; nickname: string; text: string; createdAt: string }[];
  timers: NodeJS.Timeout[];
};

const runtimes = new Map<string, RuntimeData>();

const ROOM_STATE_TTL = 60 * 60 * 6; // 6 hours

export async function loadRuntime(roomCode: string): Promise<RuntimeData | null> {
  if (runtimes.has(roomCode)) return runtimes.get(roomCode)!;
  const raw = await redis.get(`room:${roomCode}`);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Omit<RuntimeData, "timers">;
  const runtime: RuntimeData = {
    ...parsed,
    timers: []
  };
  runtimes.set(roomCode, runtime);
  return runtime;
}

export async function saveRuntime(roomCode: string, runtime: RuntimeData) {
  const { timers, ...rest } = runtime;
  await redis.set(`room:${roomCode}`, JSON.stringify(rest), "EX", ROOM_STATE_TTL);
}

export function setRuntime(roomCode: string, runtime: RuntimeData) {
  runtimes.set(roomCode, runtime);
}

export function clearRuntime(roomCode: string) {
  const runtime = runtimes.get(roomCode);
  if (runtime) {
    for (const timer of runtime.timers) clearTimeout(timer);
  }
  runtimes.delete(roomCode);
}

export function getRuntime(roomCode: string) {
  return runtimes.get(roomCode) || null;
}
