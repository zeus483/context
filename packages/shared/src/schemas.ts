import { z } from "zod";
import { DEFAULT_TIMERS } from "./constants.js";

export const TimersSchema = z.object({
  brief: z.number().min(3).max(30).default(DEFAULT_TIMERS.brief),
  prompt1: z.number().min(10).max(60).default(DEFAULT_TIMERS.prompt1),
  prompt2: z.number().min(10).max(60).default(DEFAULT_TIMERS.prompt2),
  discuss: z.number().min(30).max(150).default(DEFAULT_TIMERS.discuss),
  vote: z.number().min(10).max(30).default(DEFAULT_TIMERS.vote),
  reveal: z.number().min(8).max(25).default(DEFAULT_TIMERS.reveal)
});

export const RoomCreateSchema = z.object({
  mode: z.enum(["quick", "standard", "stream"]).default("quick"),
  timers: TimersSchema.optional(),
  packId: z.string().optional(),
  streamMode: z.boolean().optional(),
  allowTieElimination: z.boolean().optional(),
  allowDoubleInfiltrator: z.boolean().optional()
});

export const RoomJoinSchema = z.object({
  roomCode: z.string().min(4).max(8),
  nickname: z.string().min(2).max(16),
  avatar: z.string().min(1).max(4)
});

export const RoomStateSchema = z.any();

export const ConnectSchema = z.object({
  token: z.string().optional(),
  userToken: z.string().optional()
});

export const PromptSubmitSchema = z.object({
  promptId: z.string(),
  answerText: z.string().min(1).max(180),
  phaseNonce: z.string().optional()
});

export const DiscussMessageSchema = z.object({
  text: z.string().min(1).max(240)
});

export const VoteSchema = z.object({
  targetPlayerId: z.string(),
  phaseNonce: z.string().optional()
});

export const StreamJoinSchema = z.object({
  roomCode: z.string().min(4).max(8)
});
