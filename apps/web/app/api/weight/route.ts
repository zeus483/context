import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { applyRateLimit, badRequest, unauthorized, zodToResponse } from "../../../lib/http";
import { fromDateKey, toDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import { weightLogSchema } from "../../../lib/validation";
import { refreshGamification } from "../../../lib/gamification";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const rows = await prisma.bodyWeightLog.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: "asc" }
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      date: toDateKey(row.date),
      weightKg: row.weightKg
    }))
  );
}

export async function POST(req: Request) {
  const limit = applyRateLimit(req, "weight-write", 30, 60_000);
  if (limit) {
    return limit;
  }

  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = weightLogSchema.parse(body);

    const row = await prisma.bodyWeightLog.upsert({
      where: {
        userId_date: {
          userId: auth.user.id,
          date: fromDateKey(parsed.date)
        }
      },
      update: { weightKg: parsed.weightKg },
      create: {
        userId: auth.user.id,
        date: fromDateKey(parsed.date),
        weightKg: parsed.weightKg
      }
    });

    await prisma.profile.update({
      where: { userId: auth.user.id },
      data: { weightKg: parsed.weightKg }
    });

    const gamification = await refreshGamification(auth.user.id);

    return NextResponse.json({
      id: row.id,
      date: toDateKey(row.date),
      weightKg: row.weightKg,
      xpGain: Math.max(0, gamification.xpDelta),
      gamification
    });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo guardar el peso" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = weightLogSchema.parse(body);
    if (!parsed.id) {
      return badRequest("id requerido para actualizar");
    }

    const updated = await prisma.bodyWeightLog.updateMany({
      where: {
        id: parsed.id,
        userId: auth.user.id
      },
      data: {
        date: fromDateKey(parsed.date),
        weightKg: parsed.weightKg
      }
    });

    if (!updated.count) {
      return badRequest("Registro no encontrado");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo actualizar el peso" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest("id requerido");
  }

  await prisma.bodyWeightLog.deleteMany({
    where: { id, userId: auth.user.id }
  });

  return NextResponse.json({ ok: true });
}
