import type { Server } from "socket.io";
import { nanoid } from "nanoid";
import {
  DEFAULT_TIMERS,
  MODE_ROUNDS_TO_WIN,
  Phases,
  type RoomState
} from "@cc/shared";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@cc/shared";
import { contentStore } from "../services/content-store";
import { getConstraints, getPrompts, getRandomContextPair } from "../content";
import { getEnabledPackIds } from "../services/pack-settings";
import { prisma } from "../prisma";
import { saveRuntime } from "./runtime";
import type { RuntimeData } from "./runtime";
import { createRoundHighlight, createGameHighlight } from "../highlights/service";

export type SocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const SCORE_VOTE_CORRECT = 2;
const SCORE_INFILTRATOR_SURVIVE = 1;

export function initRoomState(roomCode: string, hostId: string, config: RoomState["config"], players: RoomState["players"]): RoomState {
  return {
    roomCode,
    phase: Phases.LOBBY,
    phaseEndsAt: null,
    config: {
      mode: config.mode,
      timers: config.timers ?? DEFAULT_TIMERS,
      packId: config.packId ?? null,
      streamMode: config.streamMode ?? false,
      allowTieElimination: config.allowTieElimination ?? false,
      allowDoubleInfiltrator: config.allowDoubleInfiltrator ?? true
    },
    hostId,
    players,
    currentRound: 0
  };
}

function assignRoles(players: RoomState["players"], allowDouble: boolean) {
  const ids = players.map((p) => p.id);
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const infiltrators = allowDouble && players.length >= 9 ? shuffled.slice(0, 2) : shuffled.slice(0, 1);
  const roles: Record<string, "INFILTRATOR" | "NORMAL"> = {};
  for (const id of ids) roles[id] = infiltrators.includes(id) ? "INFILTRATOR" : "NORMAL";
  return roles;
}

function publicState(runtime: RuntimeData): RoomState {
  return {
    ...runtime.state,
    roles: undefined,
    constraints: undefined,
    contexts: undefined
  };
}

async function broadcastState(io: SocketServer, runtime: RuntimeData) {
  const state = publicState(runtime);
  io.to(runtime.state.roomCode).emit("room:state", state);
  io.to(`stream:${runtime.state.roomCode}`).emit("stream:state", state);
  await saveRuntime(runtime.state.roomCode, runtime);
}

async function emitBrief(io: SocketServer, runtime: RuntimeData) {
  const sockets = await io.in(runtime.state.roomCode).fetchSockets();
  for (const socket of sockets) {
    const playerId = socket.data.playerId;
    if (!playerId) continue;
    const player = runtime.state.players.find((p) => p.id === playerId);
    if (!player || player.isAlive === false) continue;
    const role = runtime.state.roles?.[playerId] || "NORMAL";
    const contextText = role === "INFILTRATOR" ? runtime.state.contexts?.b : runtime.state.contexts?.a;
    const constraintText = runtime.state.constraints?.[playerId] || "";
    socket.emit("game:brief", { contextText: contextText || "", constraintText });
  }
}

async function emitPrompt(io: SocketServer, runtime: RuntimeData, index: number) {
  const prompt = runtime.state.prompts?.[index];
  if (!prompt) return;
  io.to(runtime.state.roomCode).emit("game:prompt", {
    promptId: prompt.id,
    promptText: prompt.text,
    rules: ["Respeta tu restricción"],
    phaseNonce: runtime.state.phaseNonce || undefined
  });
}

function setPhase(runtime: RuntimeData, phase: keyof typeof Phases, durationSec: number) {
  runtime.state.phase = Phases[phase];
  runtime.state.phaseEndsAt = Date.now() + durationSec * 1000;
  runtime.state.phaseNonce = nanoid(6);
}

async function scheduleNext(io: SocketServer, runtime: RuntimeData, nextPhase: keyof typeof Phases, delaySec: number, onStart?: () => Promise<void> | void) {
  const timer = setTimeout(async () => {
    setPhase(runtime, nextPhase, (runtime.state.config.timers as any)[nextPhase.toLowerCase()] ?? delaySec);
    await broadcastState(io, runtime);
    io.to(runtime.state.roomCode).emit("game:phase", { phase: runtime.state.phase, endsAt: runtime.state.phaseEndsAt!, payload: {} });
    if (onStart) await onStart();
    await advancePhase(io, runtime);
  }, delaySec * 1000);
  runtime.timers.push(timer);
}

export async function startGame(io: SocketServer, runtime: RuntimeData) {
  runtime.state.currentRound = 1;
  runtime.state.roles = assignRoles(runtime.state.players, !!runtime.state.config.allowDoubleInfiltrator);
  runtime.state.players = runtime.state.players.map((p) => ({ ...p, score: p.score ?? 0, isAlive: p.isAlive ?? true }));

  await prisma.room.update({ where: { id: runtime.roomId }, data: { status: "IN_GAME" } }).catch(() => undefined);

  const game = await prisma.game.create({
    data: {
      roomId: runtime.roomId,
      mode: runtime.state.config.mode,
      packId: runtime.state.config.packId || undefined
    }
  });
  runtime.state.gameId = game.id;

  await startRound(io, runtime);
}

async function startRound(io: SocketServer, runtime: RuntimeData) {
  const allowedPackIds = await getEnabledPackIds();
  const activePlayers = runtime.state.players.filter((p) => p.isAlive !== false);
  const pair = getRandomContextPair(contentStore, runtime.state.config.packId || undefined, allowedPackIds);
  const prompts = getPrompts(contentStore, runtime.state.config.packId || undefined, 2, undefined, allowedPackIds);
  const constraints = getConstraints(contentStore, runtime.state.config.packId || undefined, activePlayers.length, undefined, allowedPackIds);

  runtime.state.contexts = { a: pair.a, b: pair.b };
  runtime.state.prompts = prompts.map((p) => ({ id: p.id, text: p.text }));

  const constraintMap: Record<string, string> = {};
  activePlayers.forEach((player, idx) => {
    constraintMap[player.id] = constraints[idx % constraints.length]?.text || "";
  });
  runtime.state.constraints = constraintMap;

  runtime.answers = {};
  runtime.votes = {};
  runtime.chat = [];

  const round = await prisma.round.create({
    data: {
      gameId: runtime.state.gameId!,
      number: runtime.state.currentRound,
      contextAId: `${pair.id}:A`,
      contextBId: `${pair.id}:B`,
      infiltrators: Object.entries(runtime.state.roles || {})
        .filter(([, role]) => role === "INFILTRATOR")
        .map(([id]) => id)
    }
  });

  runtime.state.roundId = round.id;

  setPhase(runtime, "BRIEF", runtime.state.config.timers.brief);
  await broadcastState(io, runtime);
  io.to(runtime.state.roomCode).emit("game:phase", { phase: runtime.state.phase, endsAt: runtime.state.phaseEndsAt!, payload: {} });
  await emitBrief(io, runtime);

  await scheduleNext(io, runtime, "PROMPT1", runtime.state.config.timers.brief, async () => {
    await emitPrompt(io, runtime, 0);
  });
}

export async function advancePhase(io: SocketServer, runtime: RuntimeData) {
  switch (runtime.state.phase) {
    case Phases.PROMPT1:
      await scheduleNext(io, runtime, "PROMPT2", runtime.state.config.timers.prompt1, async () => {
        await emitPrompt(io, runtime, 1);
      });
      break;
    case Phases.PROMPT2:
      await scheduleNext(io, runtime, "DISCUSS", runtime.state.config.timers.prompt2);
      break;
    case Phases.DISCUSS:
      await scheduleNext(io, runtime, "VOTE", runtime.state.config.timers.discuss);
      break;
    case Phases.VOTE:
      await scheduleNext(io, runtime, "REVEAL", runtime.state.config.timers.vote, async () => {
        await handleReveal(io, runtime);
      });
      break;
    case Phases.REVEAL:
      await scheduleNext(io, runtime, "END", runtime.state.config.timers.reveal, async () => {
        await handleEndOrNext(io, runtime);
      });
      break;
    default:
      break;
  }
}

export async function handleSubmit(runtime: RuntimeData, playerId: string, promptId: string, answerText: string) {
  if (!runtime.answers[promptId]) runtime.answers[promptId] = {};
  runtime.answers[promptId][playerId] = answerText;
  await saveRuntime(runtime.state.roomCode, runtime);
}

export async function handleVote(runtime: RuntimeData, voterId: string, targetId: string) {
  runtime.votes[voterId] = targetId;
  await saveRuntime(runtime.state.roomCode, runtime);
}

function resolveVotes(runtime: RuntimeData) {
  const tally: Record<string, number> = {};
  const aliveIds = new Set(runtime.state.players.filter((p) => p.isAlive !== false).map((p) => p.id));
  Object.entries(runtime.votes).forEach(([voterId, targetId]) => {
    if (!aliveIds.has(voterId) || !aliveIds.has(targetId)) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const maxVotes = entries[0][1];
  const tied = entries.filter(([, count]) => count === maxVotes);
  if (tied.length > 1 && !runtime.state.config.allowTieElimination) return null;
  if (tied.length > 1) {
    return tied[Math.floor(Math.random() * tied.length)][0];
  }
  return entries[0][0];
}

async function handleReveal(io: SocketServer, runtime: RuntimeData) {
  const eliminatedId = resolveVotes(runtime);
  const scoreDelta: Record<string, number> = {};

  if (eliminatedId) {
    const eliminatedRole = runtime.state.roles?.[eliminatedId] || "NORMAL";
    runtime.state.players = runtime.state.players.map((p) =>
      p.id === eliminatedId ? { ...p, isAlive: false } : p
    );
    if (eliminatedRole === "INFILTRATOR") {
      for (const [voterId, targetId] of Object.entries(runtime.votes)) {
        if (targetId === eliminatedId) scoreDelta[voterId] = (scoreDelta[voterId] || 0) + SCORE_VOTE_CORRECT;
      }
    }
  }

  for (const [playerId, role] of Object.entries(runtime.state.roles || {})) {
    if (role === "INFILTRATOR") {
      scoreDelta[playerId] = (scoreDelta[playerId] || 0) + SCORE_INFILTRATOR_SURVIVE;
    }
  }

  runtime.state.players = runtime.state.players.map((p) => ({
    ...p,
    score: p.score + (scoreDelta[p.id] || 0)
  }));

  await prisma.round.update({ where: { id: runtime.state.roundId! }, data: { endedAt: new Date() } }).catch(() => undefined);

  const aliveIds = new Set(runtime.state.players.filter((p) => p.isAlive !== false).map((p) => p.id));
  await prisma.vote.createMany({
    data: Object.entries(runtime.votes)
      .filter(([voterId, targetId]) => aliveIds.has(voterId) && aliveIds.has(targetId))
      .map(([voterId, targetId]) => ({
        roundId: runtime.state.roundId!,
        voterId,
        targetId
      }))
  }).catch(() => undefined);

  const roundHighlight = await createRoundHighlight(runtime, runtime.state.roundId!, runtime.state.gameId!);

  io.to(runtime.state.roomCode).emit("game:reveal", {
    eliminated: eliminatedId,
    role: eliminatedId ? runtime.state.roles?.[eliminatedId] || null : null,
    contextsA: runtime.state.contexts?.a || "",
    contextsB: runtime.state.contexts?.b || "",
    scoreDelta,
    highlight: { id: roundHighlight.id, slug: roundHighlight.publicSlug, title: roundHighlight.title }
  });
}

async function handleEndOrNext(io: SocketServer, runtime: RuntimeData) {
  const infiltrators = Object.entries(runtime.state.roles || {})
    .filter(([, role]) => role === "INFILTRATOR")
    .map(([id]) => id);

  const aliveInfiltrators = infiltrators.filter((id) =>
    runtime.state.players.find((p) => p.id === id && p.isAlive !== false)
  );

  const roundsToWin = MODE_ROUNDS_TO_WIN[runtime.state.config.mode];
  let winner: "INFILTRATOR" | "NORMAL" | null = null;

  if (aliveInfiltrators.length === 0 && infiltrators.length > 0) {
    winner = "NORMAL";
  } else if (runtime.state.currentRound >= roundsToWin) {
    winner = "INFILTRATOR";
  }

  if (winner) {
    runtime.state.phase = Phases.END;
    runtime.state.phaseEndsAt = null;
    await prisma.game.update({
      where: { id: runtime.state.gameId! },
      data: { endedAt: new Date(), winnerSide: winner }
    });
    await prisma.room.update({ where: { id: runtime.roomId }, data: { status: "ENDED" } }).catch(() => undefined);
    await prisma.gamePlayer.createMany({
      data: runtime.state.players.map((p) => ({
        gameId: runtime.state.gameId!,
        roomMemberId: p.id,
        userId: p.userId || undefined,
        guestId: p.guestId || undefined,
        score: p.score,
        role: runtime.state.roles?.[p.id] || "NORMAL"
      }))
    }).catch(() => undefined);
    const finalHighlight = await createGameHighlight(runtime, runtime.state.gameId!, winner);
    io.to(runtime.state.roomCode).emit("game:end", {
      winner,
      highlights: [{ id: finalHighlight.id, slug: finalHighlight.publicSlug, title: finalHighlight.title }]
    });
    await broadcastState(io, runtime);
    return;
  }

  runtime.state.currentRound += 1;
  await startRound(io, runtime);
}
