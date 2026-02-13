import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized, zodToResponse } from "../../../lib/http";
import { fromDateKey, toDateKey, todayKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import { profilePatchSchema } from "../../../lib/validation";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  return NextResponse.json({
    id: auth.profile.id,
    name: auth.profile.name,
    weightKg: auth.profile.weightKg,
    heightCm: auth.profile.heightCm,
    age: auth.profile.age,
    goal: auth.profile.goal,
    trainingDays: auth.profile.trainingDays,
    availableHours: auth.profile.availableHours,
    beachGoalDate: toDateKey(auth.profile.beachGoalDate)
  });
}

export async function PATCH(req: Request) {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = profilePatchSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { userId: auth.user.id },
        data: {
          name: parsed.name,
          weightKg: parsed.weightKg,
          heightCm: parsed.heightCm,
          age: parsed.age,
          goal: parsed.goal,
          trainingDays: parsed.trainingDays,
          availableHours: parsed.availableHours,
          beachGoalDate: parsed.beachGoalDate ? fromDateKey(parsed.beachGoalDate) : undefined
        }
      });

      if (parsed.weightKg) {
        await tx.bodyWeightLog.upsert({
          where: {
            userId_date: {
              userId: auth.user.id,
              date: fromDateKey(todayKey())
            }
          },
          update: { weightKg: parsed.weightKg },
          create: {
            userId: auth.user.id,
            date: fromDateKey(todayKey()),
            weightKg: parsed.weightKg
          }
        });
      }

      return profile;
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      weightKg: updated.weightKg,
      heightCm: updated.heightCm,
      age: updated.age,
      goal: updated.goal,
      trainingDays: updated.trainingDays,
      availableHours: updated.availableHours,
      beachGoalDate: toDateKey(updated.beachGoalDate)
    });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}
