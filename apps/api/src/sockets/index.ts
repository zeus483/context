import type { Server } from "socket.io";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import sanitizeHtml from "sanitize-html";
import { config } from "../config";
import { prisma } from "../prisma";
import { logger } from "../logger";
import { initRoomState, startGame, handleSubmit, handleVote } from "../game/engine";
import type { RuntimeData } from "../game/runtime";
import { loadRuntime, saveRuntime, setRuntime, getRuntime } from "../game/runtime";
import { Phases, type RoomConfig } from "@cc/shared";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "@cc/shared";

const bannedWords = ["idiota", "imbecil", "estupido", "tonto", "grosero"];
const textSanitize = (text: string) => {
  let cleaned = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
  for (const word of bannedWords) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(re, "***");
  }
  return cleaned;
};

async function signToken(payload: Record<string, string>, secret: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
}

async function verifyToken(token: string, secret: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload as Record<string, string>;
}

function buildRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

const chatCooldown = new Map<string, number>();
const joinCooldown = new Map<string, number>();
const submitCooldown = new Map<string, number>();

const publicState = (state: any) => ({ ...state, roles: undefined, constraints: undefined, contexts: undefined });

export function registerSockets(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  io.on("connection", (socket) => {
    socket.on("client:connect", async ({ token, userToken }) => {
      try {
        let guestId: string | null = null;
        let userId: string | null = null;
        if (userToken) {
          const payload = await verifyToken(userToken, config.userTokenSecret);
          userId = payload.userId || null;
          if (userId) {
            const ban = await prisma.ban.findFirst({ where: { targetId: userId, until: { gt: new Date() } } });
            if (ban) {
              socket.emit("room:error", { message: "Cuenta bloqueada temporalmente" });
              return socket.disconnect();
            }
          }
        }
        if (!userId) {
          if (token) {
            const payload = await verifyToken(token, config.jwtSecret);
            guestId = payload.guestId || null;
            if (guestId) {
              const guest = await prisma.guestSession.findUnique({ where: { id: guestId } });
              if (guest?.bannedUntil && guest.bannedUntil > new Date()) {
                socket.emit("room:error", { message: "Sesión bloqueada temporalmente" });
                return socket.disconnect();
              }
              await prisma.guestSession.update({ where: { id: guestId }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
            }
          }
          if (!guestId) {
            const guest = await prisma.guestSession.create({ data: {} });
            guestId = guest.id;
            token = await signToken({ guestId }, config.jwtSecret);
          }
        }

        socket.data.guestId = guestId || undefined;
        socket.data.userId = userId || undefined;

        socket.emit("server:connected", {
          sessionId: guestId || userId || "",
          userId: userId || null,
          limits: { chatCooldownMs: config.chatCooldownMs },
          guestToken: token
        });
      } catch (err) {
        logger.error(err, "connect failed");
        socket.emit("room:error", { message: "Error de autenticación" });
      }
    });

    socket.on("room:create", async (payload) => {
      const configPayload = payload as RoomConfig;
      if (!socket.data.guestId && !socket.data.userId) {
        return socket.emit("room:error", { message: "Sesión inválida" });
      }
      const roomCode = buildRoomCode();
      const room = await prisma.room.create({
        data: {
          code: roomCode,
          hostUserId: socket.data.userId || undefined,
          hostGuestId: socket.data.guestId || undefined,
          config: {
            ...configPayload,
            timers: configPayload.timers ?? {
              brief: 8,
              prompt1: 25,
              prompt2: 25,
              discuss: 75,
              vote: 15,
              reveal: 12
            }
          }
        }
      });

      const member = await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: socket.data.userId || undefined,
          guestId: socket.data.guestId || undefined,
          nickname: "Host",
          avatar: "🕹️",
          isConnected: true
        }
      });

      const state = initRoomState(roomCode, member.id, configPayload, [
        {
          id: member.id,
          nickname: member.nickname,
          avatar: member.avatar,
          isHost: true,
          isConnected: true,
          isAlive: true,
          score: 0,
          userId: member.userId,
          guestId: member.guestId
        }
      ]);

      const runtime: RuntimeData = {
        roomId: room.id,
        state,
        answers: {},
        votes: {},
        chat: [],
        timers: []
      };

      setRuntime(roomCode, runtime);
      await saveRuntime(roomCode, runtime);

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerId = member.id;

      socket.emit("room:created", {
        roomCode,
        joinUrl: `${config.publicWebUrl.replace(/\/$/, "")}/room/${roomCode}`
      });
      io.to(roomCode).emit("room:state", publicState(runtime.state));
    });

    socket.on("room:join", async (payload) => {
      const { roomCode, nickname, avatar } = payload as { roomCode: string; nickname: string; avatar: string };
      const cleanNickname = textSanitize(nickname).slice(0, 16) || "Jugador";
      const cleanAvatar = textSanitize(avatar).slice(0, 4) || "🙂";
      if (!socket.data.guestId && !socket.data.userId) {
        return socket.emit("room:error", { message: "Sesión inválida" });
      }
      const lastJoin = joinCooldown.get(socket.id) || 0;
      if (Date.now() - lastJoin < 1500) {
        return socket.emit("room:error", { message: "Espera un momento antes de intentar de nuevo" });
      }
      joinCooldown.set(socket.id, Date.now());
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return socket.emit("room:error", { message: "Sala no encontrada" });

      let runtime = await loadRuntime(roomCode);
      if (!runtime) {
        const members = await prisma.roomMember.findMany({ where: { roomId: room.id } });
        const players = members.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          avatar: m.avatar,
          isHost: room.hostUserId ? m.userId === room.hostUserId : m.guestId === room.hostGuestId,
          isConnected: m.isConnected,
          isAlive: true,
          score: 0,
          userId: m.userId,
          guestId: m.guestId
        }));
        const configPayload = room.config as RoomConfig;
        const hostId = players.find((p) => p.isHost)?.id || players[0]?.id || "";
        const state = initRoomState(roomCode, hostId, configPayload, players);
        runtime = {
          roomId: room.id,
          state,
          answers: {},
          votes: {},
          chat: [],
          timers: []
        };
        setRuntime(roomCode, runtime);
        await saveRuntime(roomCode, runtime);
      }

      let member = await prisma.roomMember.findFirst({
        where: {
          roomId: room.id,
          OR: [
            socket.data.userId ? { userId: socket.data.userId } : undefined,
            socket.data.guestId ? { guestId: socket.data.guestId } : undefined
          ].filter(Boolean) as any
        }
      });

      if (!member && room.status !== "LOBBY") {
        return socket.emit("room:error", { message: "La partida ya inició" });
      }

      if (!member) {
        if (runtime.state.players.length >= 10) {
          return socket.emit("room:error", { message: "Sala llena" });
        }
        member = await prisma.roomMember.create({
          data: {
            roomId: room.id,
            userId: socket.data.userId || undefined,
            guestId: socket.data.guestId || undefined,
            nickname: cleanNickname,
            avatar: cleanAvatar,
            isConnected: true
          }
        });
        runtime.state.players.push({
          id: member.id,
          nickname: member.nickname,
          avatar: member.avatar,
          isHost: false,
          isConnected: true,
          isAlive: true,
          score: 0,
          userId: member.userId,
          guestId: member.guestId
        });
      } else {
        await prisma.roomMember.update({ where: { id: member.id }, data: { isConnected: true, nickname: cleanNickname, avatar: cleanAvatar } });
        runtime.state.players = runtime.state.players.map((p) =>
          p.id === member!.id ? { ...p, nickname: cleanNickname, avatar: cleanAvatar, isConnected: true } : p
        );
      }

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerId = member.id;

      await saveRuntime(roomCode, runtime);
      io.to(roomCode).emit("room:state", publicState(runtime.state));
    });

    socket.on("room:leave", async () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      runtime.state.players = runtime.state.players.map((p) =>
        p.id === socket.data.playerId ? { ...p, isConnected: false } : p
      );
      await prisma.roomMember.update({ where: { id: socket.data.playerId! }, data: { isConnected: false } }).catch(() => undefined);
      await saveRuntime(roomCode, runtime);
      io.to(roomCode).emit("room:state", publicState(runtime.state));
      socket.leave(roomCode);
    });

    socket.on("room:kick", async ({ targetPlayerId }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      if (runtime.state.hostId !== socket.data.playerId) return;
      runtime.state.players = runtime.state.players.filter((p) => p.id !== targetPlayerId);
      await prisma.roomMember.delete({ where: { id: targetPlayerId } }).catch(() => undefined);
      await saveRuntime(roomCode, runtime);
      io.to(roomCode).emit("room:state", publicState(runtime.state));
      const sockets = await io.in(roomCode).fetchSockets();
      sockets.forEach((s) => {
        if (s.data.playerId === targetPlayerId) s.leave(roomCode);
      });
    });

    socket.on("game:start", async () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      if (runtime.state.hostId !== socket.data.playerId) return;
      if (runtime.state.players.length < 3) {
        return socket.emit("room:error", { message: "Se necesitan al menos 3 jugadores" });
      }
      await startGame(io as any, runtime);
    });

    socket.on("game:submit", async ({ promptId, answerText, phaseNonce }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      if (runtime.state.phase !== Phases.PROMPT1 && runtime.state.phase !== Phases.PROMPT2) return;
      if (!runtime.state.players.find((p) => p.id === socket.data.playerId && p.isAlive !== false)) return;
      if (phaseNonce && phaseNonce !== runtime.state.phaseNonce) return;
      const lastSubmit = submitCooldown.get(socket.data.playerId || "") || 0;
      if (Date.now() - lastSubmit < 500) return;
      submitCooldown.set(socket.data.playerId || "", Date.now());
      const safeText = textSanitize(answerText).slice(0, 180);
      await handleSubmit(runtime, socket.data.playerId!, promptId, safeText);
    });

    socket.on("game:discuss:message", async ({ text }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      if (runtime.state.phase !== Phases.DISCUSS) return;
      if (!runtime.state.players.find((p) => p.id === socket.data.playerId && p.isAlive !== false)) return;
      const now = Date.now();
      const last = chatCooldown.get(socket.data.playerId || "") || 0;
      if (now - last < config.chatCooldownMs) return;
      chatCooldown.set(socket.data.playerId || "", now);
      const safeText = textSanitize(text).slice(0, config.maxChatLength);

      const member = runtime.state.players.find((p) => p.id === socket.data.playerId);
      if (!member) return;
      const msg = {
        id: nanoid(8),
        authorId: member.id,
        nickname: member.nickname,
        text: safeText,
        createdAt: new Date().toISOString()
      };
      runtime.chat.push(msg);
      await prisma.message.create({
        data: {
          roomId: runtime.roomId,
          authorId: member.id,
          text: safeText,
          flags: {}
        }
      }).catch(() => undefined);

      io.to(roomCode).emit("game:discuss:message", msg);
      setTimeout(() => {
        io.to(`stream:${roomCode}`).emit("game:discuss:message", msg);
      }, config.streamChatDelayMs);
    });

    socket.on("game:vote", async ({ targetPlayerId, phaseNonce }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      if (runtime.state.phase !== Phases.VOTE) return;
      if (phaseNonce && phaseNonce !== runtime.state.phaseNonce) return;
      if (runtime.votes[socket.data.playerId || ""]) return;
      if (!runtime.state.players.find((p) => p.id === socket.data.playerId && p.isAlive !== false)) return;
      if (!runtime.state.players.find((p) => p.id === targetPlayerId)) return;
      await handleVote(runtime, socket.data.playerId!, targetPlayerId);
    });

    socket.on("stream:join", async ({ roomCode }) => {
      const runtime = await loadRuntime(roomCode);
      if (!runtime) return;
      if (!runtime.state.config.streamMode) return;
      socket.join(`stream:${roomCode}`);
      socket.emit("stream:state", publicState(runtime.state));
    });

    socket.on("disconnect", async () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const runtime = getRuntime(roomCode);
      if (!runtime) return;
      runtime.state.players = runtime.state.players.map((p) =>
        p.id === socket.data.playerId ? { ...p, isConnected: false } : p
      );
      await prisma.roomMember.update({ where: { id: socket.data.playerId! }, data: { isConnected: false } }).catch(() => undefined);
      await saveRuntime(roomCode, runtime);
      io.to(roomCode).emit("room:state", publicState(runtime.state));
    });
  });
}
