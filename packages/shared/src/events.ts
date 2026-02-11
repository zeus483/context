import type { RoomConfig, RoomState } from "./types.js";
import type { Phase } from "./constants.js";

export type ClientToServerEvents = {
  "client:connect": (payload: { token?: string; userToken?: string }) => void;
  "room:create": (payload: { mode: RoomConfig["mode"]; timers?: RoomConfig["timers"]; packId?: string; streamMode?: boolean; allowTieElimination?: boolean; allowDoubleInfiltrator?: boolean }) => void;
  "room:join": (payload: { roomCode: string; nickname: string; avatar: string }) => void;
  "room:leave": () => void;
  "room:kick": (payload: { targetPlayerId: string }) => void;
  "game:start": () => void;
  "game:submit": (payload: { promptId: string; answerText: string; phaseNonce?: string }) => void;
  "game:discuss:message": (payload: { text: string }) => void;
  "game:vote": (payload: { targetPlayerId: string; phaseNonce?: string }) => void;
  "stream:join": (payload: { roomCode: string }) => void;
};

export type ServerToClientEvents = {
  "server:connected": (payload: { sessionId: string; userId?: string | null; limits: { chatCooldownMs: number }; guestToken?: string }) => void;
  "room:created": (payload: { roomCode: string; joinUrl: string }) => void;
  "room:state": (payload: RoomState) => void;
  "room:error": (payload: { message: string }) => void;
  "game:phase": (payload: { phase: Phase; endsAt: number; payload?: Record<string, unknown> }) => void;
  "game:brief": (payload: { contextText: string; constraintText: string }) => void;
  "game:prompt": (payload: { promptId: string; promptText: string; rules?: string[]; phaseNonce?: string }) => void;
  "game:reveal": (payload: { eliminated?: string | null; role?: string | null; contextsA: string; contextsB: string; scoreDelta: Record<string, number>; highlight?: { id: string; slug: string; title: string } }) => void;
  "game:end": (payload: { winner: "INFILTRATOR" | "NORMAL"; highlights: { id: string; slug: string; title: string }[] }) => void;
  "stream:state": (payload: RoomState) => void;
  "game:discuss:message": (payload: { id: string; authorId: string; nickname: string; text: string; createdAt: string }) => void;
};

export type InterServerEvents = Record<string, never>;
export type SocketData = {
  roomCode?: string;
  playerId?: string;
  guestId?: string;
  userId?: string;
};
