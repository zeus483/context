import { redis } from "../redis";
const runtimes = new Map();
const ROOM_STATE_TTL = 60 * 60 * 6; // 6 hours
export async function loadRuntime(roomCode) {
    if (runtimes.has(roomCode))
        return runtimes.get(roomCode);
    const raw = await redis.get(`room:${roomCode}`);
    if (!raw)
        return null;
    const parsed = JSON.parse(raw);
    const runtime = {
        ...parsed,
        timers: []
    };
    runtimes.set(roomCode, runtime);
    return runtime;
}
export async function saveRuntime(roomCode, runtime) {
    const { timers, ...rest } = runtime;
    await redis.set(`room:${roomCode}`, JSON.stringify(rest), "EX", ROOM_STATE_TTL);
}
export function setRuntime(roomCode, runtime) {
    runtimes.set(roomCode, runtime);
}
export function clearRuntime(roomCode) {
    const runtime = runtimes.get(roomCode);
    if (runtime) {
        for (const timer of runtime.timers)
            clearTimeout(timer);
    }
    runtimes.delete(roomCode);
}
export function getRuntime(roomCode) {
    return runtimes.get(roomCode) || null;
}
