import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { badRequest, unauthorized, zodToResponse } from "../../../lib/http";
import { fromDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import { reprogramSchema } from "../../../lib/validation";
import { resolveAssignment } from "../../../lib/workout";

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = reprogramSchema.parse(body);

    if (parsed.fromDate === parsed.toDate) {
      return badRequest("El día origen y destino no pueden ser iguales");
    }

    const trainingDays = (auth.profile.trainingDays === 6 ? 6 : 5) as 5 | 6;
    const source = await resolveAssignment(auth.user.id, parsed.fromDate, trainingDays);

    if (source.isRest || !source.workoutDayId) {
      return badRequest("No hay entrenamiento para reprogramar en esa fecha");
    }

    const targetDate = fromDateKey(parsed.toDate);

    await prisma.$transaction(async (tx) => {
      await tx.workoutAssignment.upsert({
        where: {
          userId_date: {
            userId: auth.user.id,
            date: fromDateKey(parsed.fromDate)
          }
        },
        update: {
          isRest: true,
          workoutDayId: null
        },
        create: {
          userId: auth.user.id,
          date: fromDateKey(parsed.fromDate),
          isRest: true
        }
      });

      await tx.workoutAssignment.upsert({
        where: {
          userId_date: {
            userId: auth.user.id,
            date: targetDate
          }
        },
        update: {
          isRest: false,
          workoutDayId: source.workoutDayId,
          movedFromDate: fromDateKey(parsed.fromDate)
        },
        create: {
          userId: auth.user.id,
          date: targetDate,
          isRest: false,
          workoutDayId: source.workoutDayId,
          movedFromDate: fromDateKey(parsed.fromDate)
        }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo reprogramar" }, { status: 500 });
  }
}
