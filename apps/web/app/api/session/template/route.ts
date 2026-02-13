import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { unauthorized, badRequest } from "../../../../lib/http";
import { fromDateKey, todayKey } from "../../../../lib/dates";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const workoutDayId = searchParams.get("workoutDayId");
  const dateKey = searchParams.get("date") ?? todayKey();

  if (!workoutDayId) {
    return badRequest("workoutDayId es requerido");
  }

  const date = fromDateKey(dateKey);

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: {
      dayExercises: {
        orderBy: { order: "asc" },
        include: { exercise: true }
      }
    }
  });

  if (!workoutDay) {
    return badRequest("Día de entrenamiento no encontrado");
  }

  const existingSession = await prisma.workoutSession.findFirst({
    where: {
      userId: auth.user.id,
      workoutDayId,
      date
    },
    include: {
      sets: true,
      cardioEntry: true
    }
  });

  const exerciseIds = workoutDay.dayExercises.map((entry) => entry.exerciseId);

  const previousSets = await prisma.exerciseSet.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      workoutSession: {
        userId: auth.user.id,
        date: { lt: date }
      },
      completed: true
    },
    include: {
      workoutSession: {
        select: { date: true }
      }
    },
    orderBy: [
      { workoutSession: { date: "desc" } },
      { setNumber: "asc" }
    ]
  });

  const suggestions = new Map<string, { weightKg: number | null; reps: number | null }>();
  for (const set of previousSets) {
    if (suggestions.has(set.exerciseId)) {
      continue;
    }
    suggestions.set(set.exerciseId, {
      weightKg: set.weightKg,
      reps: set.reps
    });
  }

  return NextResponse.json({
    date: dateKey,
    day: {
      id: workoutDay.id,
      title: workoutDay.title,
      focus: workoutDay.focus,
      cardioDefault: workoutDay.cardioDefault,
      exercises: workoutDay.dayExercises.map((entry) => ({
        dayExerciseId: entry.id,
        exerciseId: entry.exercise.id,
        name: entry.exercise.name,
        muscleGroup: entry.exercise.muscleGroup,
        equipment: entry.exercise.equipment,
        instructions: entry.exercise.instructions,
        suggestedSets: entry.suggestedSets,
        suggestedReps: entry.suggestedReps,
        suggestedRestSec: entry.suggestedRestSec,
        previous: suggestions.get(entry.exercise.id) ?? { weightKg: null, reps: null }
      }))
    },
    session: existingSession
      ? {
          id: existingSession.id,
          status: existingSession.status,
          notes: existingSession.notes,
          cardio: existingSession.cardioEntry,
          sets: existingSession.sets
        }
      : null
  });
}
