import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { unauthorized, zodToResponse } from "../../../../lib/http";
import { fromDateKey, todayKey, weekBounds } from "../../../../lib/dates";
import { prisma } from "../../../../lib/prisma";
import { weeklyCheckinSchema } from "../../../../lib/validation";
import { getWeeklyState, refreshGamification, upsertWeeklyRecommendation } from "../../../../lib/gamification";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const state = await getWeeklyState(auth.user.id);

  return NextResponse.json({
    weekStartDate: state.startKey,
    weekEndDate: state.endKey,
    pendingCurrentWeek: state.pendingCurrentWeek,
    pendingPreviousWeek: state.pendingPreviousWeek,
    previousWeekStart: state.previousWeekStart,
    previousWeekEnd: state.previousWeekEnd,
    checkin: state.checkin,
    recommendation: state.recommendation
  });
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = weeklyCheckinSchema.parse(body);
    const { startKey, endKey } = weekBounds(parsed.weekStartDate ?? todayKey());

    const checkin = await prisma.weeklyCheckin.upsert({
      where: {
        userId_weekStartDate: {
          userId: auth.user.id,
          weekStartDate: fromDateKey(startKey)
        }
      },
      update: {
        weekEndDate: fromDateKey(endKey),
        effortScore: parsed.effortScore,
        fatigueFlag: parsed.fatigueFlag
      },
      create: {
        userId: auth.user.id,
        weekStartDate: fromDateKey(startKey),
        weekEndDate: fromDateKey(endKey),
        effortScore: parsed.effortScore,
        fatigueFlag: parsed.fatigueFlag
      }
    });

    const recommendation = await upsertWeeklyRecommendation(auth.user.id, startKey);
    const snapshot = await refreshGamification(auth.user.id);

    return NextResponse.json({
      ok: true,
      checkin,
      recommendation,
      gamification: snapshot
    });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo guardar el check-in semanal" }, { status: 500 });
  }
}
