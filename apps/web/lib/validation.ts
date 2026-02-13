import { z } from "zod";

export const emailSchema = z.string().trim().email().max(120);
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener mínimo 8 caracteres")
  .max(120)
  .regex(/[A-Za-z]/, "Incluye al menos una letra")
  .regex(/[0-9]/, "Incluye al menos un número");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  profile: z
    .object({
      name: z.string().trim().max(60).optional(),
      weightKg: z.number().min(30).max(250),
      heightCm: z.number().int().min(120).max(230),
      age: z.number().int().min(16).max(90),
      trainingDays: z.union([z.literal(5), z.literal(6)]),
      availableHours: z.number().int().min(1).max(3),
      beachGoalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
    .optional()
});

export const profilePatchSchema = z.object({
  name: z.string().trim().max(60).optional(),
  weightKg: z.number().min(30).max(250).optional(),
  heightCm: z.number().int().min(120).max(230).optional(),
  age: z.number().int().min(16).max(90).optional(),
  trainingDays: z.union([z.literal(5), z.literal(6)]).optional(),
  availableHours: z.number().int().min(1).max(3).optional(),
  beachGoalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  goal: z.string().trim().max(80).optional()
});

const setSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(999).nullable(),
  reps: z.number().int().min(0).max(100).nullable(),
  rir: z.number().int().min(0).max(5).nullable(),
  notes: z.string().trim().max(280).nullable().optional(),
  completed: z.boolean()
});

const cardioSchema = z
  .object({
    cardioType: z.string().trim().min(2).max(80),
    minutes: z.number().int().min(0).max(120),
    intensity: z.union([z.literal("LOW"), z.literal("MEDIUM"), z.literal("HIGH")]),
    reasonIfZero: z.string().trim().max(180).optional()
  })
  .superRefine((value, ctx) => {
    if (value.minutes === 0 && !value.reasonIfZero) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reasonIfZero"],
        message: "Si cardio es 0, debes registrar el motivo"
      });
    }
  });

export const upsertSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutDayId: z.string().min(1),
  notes: z.string().trim().max(600).optional(),
  finalize: z.boolean().optional(),
  sets: z.array(setSchema).min(1),
  cardio: cardioSchema
});

export const weightLogSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().min(30).max(250)
});

export const photoSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  imageUrl: z.string().url(),
  privacyNote: z.string().trim().max(200).optional()
});

export const reprogramSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
