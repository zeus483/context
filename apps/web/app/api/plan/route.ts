import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { getActivePlan } from "../../../lib/workout";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const plan = await getActivePlan();
  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    days: plan.workoutDays.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      focus: day.focus,
      optional: day.isOptional,
      cardioDefault: day.cardioDefault,
      exercises: day.dayExercises.map((entry) => ({
        id: entry.exercise.id,
        name: entry.exercise.name,
        muscleGroup: entry.exercise.muscleGroup,
        equipment: entry.exercise.equipment,
        suggestedSets: entry.suggestedSets,
        suggestedReps: entry.suggestedReps,
        suggestedRestSec: entry.suggestedRestSec
      }))
    }))
  });
}
