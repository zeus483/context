import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { applyRateLimit, badRequest, unauthorized, zodToResponse } from "../../../lib/http";
import { fromDateKey, todayKey, toDateKey } from "../../../lib/dates";
import { upsertSessionSchema } from "../../../lib/validation";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { refreshGamification } from "../../../lib/gamification";

type SessionInput = z.infer<typeof upsertSessionSchema>;

async function ensureSessionDay(input: SessionInput, userId: string) {
  if (input.planType === "BASE") {
    const day = await prisma.workoutDay.findUnique({ where: { id: input.dayId } });
    if (!day) {
      return null;
    }

    if (day.workoutPlanId !== input.planId) {
      throw new Error("El día no corresponde al plan base seleccionado");
    }

    return {
      planType: "BASE" as const,
      basePlanId: day.workoutPlanId,
      customPlanId: null,
      workoutDayId: day.id,
      customWorkoutDayId: null
    };
  }

  const day = await prisma.customWorkoutDay.findFirst({
    where: {
      id: input.dayId,
      planId: input.planId,
      plan: {
        userId,
        isArchived: false
      }
    }
  });

  if (!day) {
    return null;
  }

  return {
    planType: "CUSTOM" as const,
    basePlanId: null,
    customPlanId: day.planId,
    workoutDayId: null,
    customWorkoutDayId: day.id
  };
}

async function upsertSession(req: Request) {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = upsertSessionSchema.parse(body) as SessionInput;

  const date = fromDateKey(parsed.date);
  const dayBinding = await ensureSessionDay(parsed, auth.user.id);

  if (!dayBinding) {
    return badRequest("Día de entrenamiento no encontrado");
  }

  const allSetsCompleted = parsed.sets.every((set) => set.completed);
  const cardioLogged = parsed.cardio.minutes > 0 || Boolean(parsed.cardio.reasonIfZero);
  const status = allSetsCompleted && cardioLogged ? "DONE" : "PARTIAL";

  const session = await prisma.$transaction(async (tx) => {
    const existingAssignment = await tx.workoutAssignment.findUnique({
      where: { userId_date: { userId: auth.user.id, date } }
    });

    await tx.workoutAssignment.upsert({
      where: { userId_date: { userId: auth.user.id, date } },
      update: {
        ...dayBinding,
        isRest: false
      },
      create: {
        userId: auth.user.id,
        date,
        ...dayBinding,
        isRest: false,
        movedFromDate: existingAssignment?.movedFromDate ?? null
      }
    });

    let savedSession;

    if (dayBinding.planType === "BASE" && dayBinding.workoutDayId) {
      savedSession = await tx.workoutSession.upsert({
        where: {
          userId_date_workoutDayId: {
            userId: auth.user.id,
            date,
            workoutDayId: dayBinding.workoutDayId
          }
        },
        update: {
          notes: parsed.notes,
          status,
          durationMinutes: parsed.durationMinutes,
          planType: "BASE",
          basePlanId: dayBinding.basePlanId,
          customPlanId: null,
          movedFromDate: existingAssignment?.movedFromDate ?? null
        },
        create: {
          userId: auth.user.id,
          date,
          notes: parsed.notes,
          status,
          durationMinutes: parsed.durationMinutes,
          planType: "BASE",
          basePlanId: dayBinding.basePlanId,
          workoutDayId: dayBinding.workoutDayId,
          movedFromDate: existingAssignment?.movedFromDate ?? null
        }
      });
    } else if (dayBinding.planType === "CUSTOM" && dayBinding.customWorkoutDayId) {
      savedSession = await tx.workoutSession.upsert({
        where: {
          userId_date_customWorkoutDayId: {
            userId: auth.user.id,
            date,
            customWorkoutDayId: dayBinding.customWorkoutDayId
          }
        },
        update: {
          notes: parsed.notes,
          status,
          durationMinutes: parsed.durationMinutes,
          planType: "CUSTOM",
          basePlanId: null,
          customPlanId: dayBinding.customPlanId,
          movedFromDate: existingAssignment?.movedFromDate ?? null
        },
        create: {
          userId: auth.user.id,
          date,
          notes: parsed.notes,
          status,
          durationMinutes: parsed.durationMinutes,
          planType: "CUSTOM",
          customPlanId: dayBinding.customPlanId,
          customWorkoutDayId: dayBinding.customWorkoutDayId,
          movedFromDate: existingAssignment?.movedFromDate ?? null
        }
      });
    } else {
      throw new Error("No se pudo asociar el día de entrenamiento");
    }

    await tx.exerciseSet.deleteMany({ where: { workoutSessionId: savedSession.id } });
    await tx.exerciseSet.createMany({
      data: parsed.sets.map((set) => ({
        workoutSessionId: savedSession.id,
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        weightKg: set.weightKg,
        reps: set.reps,
        rir: set.rir,
        notes: set.notes ?? null,
        completed: set.completed
      }))
    });

    await tx.cardioEntry.upsert({
      where: { workoutSessionId: savedSession.id },
      update: {
        cardioType: parsed.cardio.cardioType,
        minutes: parsed.cardio.minutes,
        intensity: parsed.cardio.intensity,
        reasonIfZero: parsed.cardio.reasonIfZero ?? null
      },
      create: {
        workoutSessionId: savedSession.id,
        cardioType: parsed.cardio.cardioType,
        minutes: parsed.cardio.minutes,
        intensity: parsed.cardio.intensity,
        reasonIfZero: parsed.cardio.reasonIfZero ?? null
      }
    });

    return tx.workoutSession.findUnique({
      where: { id: savedSession.id },
      include: {
        workoutDay: true,
        customWorkoutDay: true,
        sets: {
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          include: { exercise: true }
        },
        cardioEntry: true
      }
    });
  });

  const gamification = await refreshGamification(auth.user.id);

  return NextResponse.json({
    ok: true,
    session,
    gamification,
    xpGain: Math.max(0, gamification.xpDelta)
  });
}

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const dateKey = searchParams.get("date") ?? todayKey();
  const date = fromDateKey(dateKey);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth.user.id,
      date
    },
    include: {
      workoutDay: true,
      customWorkoutDay: true,
      cardioEntry: true,
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }]
      }
    }
  });

  return NextResponse.json({
    date: toDateKey(date),
    sessions
  });
}

export async function POST(req: Request) {
  const limit = applyRateLimit(req, "session-write", 60, 60_000);
  if (limit) {
    return limit;
  }

  try {
    return await upsertSession(req);
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo guardar la sesión" }, { status: 500 });
  }
}

export const PUT = POST;
