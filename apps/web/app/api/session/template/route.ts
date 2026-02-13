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
  const dayId = searchParams.get("dayId") ?? searchParams.get("workoutDayId");
  const queryPlanType = searchParams.get("planType");
  const dateKey = searchParams.get("date") ?? todayKey();

  if (!dayId) {
    return badRequest("dayId es requerido");
  }

  const date = fromDateKey(dateKey);

  let planType: "BASE" | "CUSTOM" = queryPlanType === "CUSTOM" ? "CUSTOM" : "BASE";
  let planId: string | null = null;
  let dayTitle = "";
  let dayFocus = "";
  let cardioDefault = 0;
  let exercises: Array<{
    dayExerciseId: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
    equipment: string;
    instructions: string;
    suggestedSets: number;
    suggestedReps: string;
    suggestedRestSec: number;
  }> = [];

  const baseDay =
    planType === "BASE"
      ? await prisma.workoutDay.findUnique({
          where: { id: dayId },
          include: {
            dayExercises: {
              orderBy: { order: "asc" },
              include: { exercise: true }
            }
          }
        })
      : null;

  if (baseDay) {
    planType = "BASE";
    planId = baseDay.workoutPlanId;
    dayTitle = baseDay.title;
    dayFocus = baseDay.focus;
    cardioDefault = baseDay.cardioDefault;
    exercises = baseDay.dayExercises.map((entry) => ({
      dayExerciseId: entry.id,
      exerciseId: entry.exercise.id,
      name: entry.exercise.name,
      muscleGroup: entry.exercise.muscleGroup,
      equipment: entry.exercise.equipment,
      instructions: entry.exercise.instructions,
      suggestedSets: entry.suggestedSets,
      suggestedReps: entry.suggestedReps,
      suggestedRestSec: entry.suggestedRestSec
    }));
  } else {
    const customDay = await prisma.customWorkoutDay.findFirst({
      where: {
        id: dayId,
        plan: {
          userId: auth.user.id
        }
      },
      include: {
        customWorkoutExercises: {
          orderBy: { order: "asc" },
          include: { exercise: true }
        }
      }
    });

    if (!customDay) {
      return badRequest("Día de entrenamiento no encontrado");
    }

    planType = "CUSTOM";
    planId = customDay.planId;
    dayTitle = customDay.name;
    dayFocus = customDay.focus;
    cardioDefault = customDay.cardioDefault;
    exercises = customDay.customWorkoutExercises.map((entry) => ({
      dayExerciseId: entry.id,
      exerciseId: entry.exercise.id,
      name: entry.exercise.name,
      muscleGroup: entry.exercise.muscleGroup,
      equipment: entry.exercise.equipment,
      instructions: entry.exercise.instructions,
      suggestedSets: entry.sets,
      suggestedReps: entry.reps,
      suggestedRestSec: entry.restSeconds
    }));
  }

  const existingSession = await prisma.workoutSession.findFirst({
    where: {
      userId: auth.user.id,
      date,
      ...(planType === "BASE"
        ? {
            workoutDayId: dayId
          }
        : {
            customWorkoutDayId: dayId
          })
    },
    include: {
      sets: true,
      cardioEntry: true
    }
  });

  const exerciseIds = exercises.map((entry) => entry.exerciseId);

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
    orderBy: [{ workoutSession: { date: "desc" } }, { setNumber: "asc" }]
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
      id: dayId,
      planType,
      planId,
      title: dayTitle,
      focus: dayFocus,
      cardioDefault,
      exercises: exercises.map((entry) => ({
        ...entry,
        previous: suggestions.get(entry.exerciseId) ?? { weightKg: null, reps: null }
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
