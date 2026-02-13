import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { applyRateLimit, badRequest, unauthorized, zodToResponse } from "../../../lib/http";
import { fromDateKey, todayKey } from "../../../lib/dates";
import { upsertSessionSchema } from "../../../lib/validation";
import { prisma } from "../../../lib/prisma";
import { resolveAssignment } from "../../../lib/workout";
import { z } from "zod";

type SessionInput = z.infer<typeof upsertSessionSchema>;

async function upsertSession(req: Request) {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = upsertSessionSchema.parse(body) as SessionInput;
  const trainingDays = (auth.profile.trainingDays === 6 ? 6 : 5) as 5 | 6;

  const date = fromDateKey(parsed.date);
  const workoutDay = await prisma.workoutDay.findUnique({ where: { id: parsed.workoutDayId } });
  if (!workoutDay) {
    return badRequest("Día de entrenamiento no encontrado");
  }

  const assignment = await resolveAssignment(auth.user.id, parsed.date, trainingDays);
  const allSetsCompleted = parsed.sets.every((set) => set.completed);
  const cardioLogged = parsed.cardio.minutes > 0 || Boolean(parsed.cardio.reasonIfZero);
  const status = allSetsCompleted && cardioLogged ? "DONE" : "PARTIAL";

  const session = await prisma.$transaction(async (tx) => {
    await tx.workoutAssignment.upsert({
      where: { userId_date: { userId: auth.user.id, date } },
      update: {
        workoutDayId: workoutDay.id,
        isRest: false
      },
      create: {
        userId: auth.user.id,
        date,
        workoutDayId: workoutDay.id,
        isRest: false,
        movedFromDate: assignment.movedFromDate
      }
    });

    const savedSession = await tx.workoutSession.upsert({
      where: {
        userId_date_workoutDayId: {
          userId: auth.user.id,
          date,
          workoutDayId: workoutDay.id
        }
      },
      update: {
        notes: parsed.notes,
        status,
        movedFromDate: assignment.movedFromDate
      },
      create: {
        userId: auth.user.id,
        workoutDayId: workoutDay.id,
        date,
        notes: parsed.notes,
        status,
        movedFromDate: assignment.movedFromDate
      }
    });

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
        sets: {
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          include: { exercise: true }
        },
        cardioEntry: true
      }
    });
  });

  return NextResponse.json({ ok: true, session });
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
      cardioEntry: true,
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }]
      }
    }
  });

  return NextResponse.json({ sessions });
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
