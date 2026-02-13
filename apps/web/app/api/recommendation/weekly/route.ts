import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { unauthorized } from "../../../../lib/http";
import { ensureRecentRecommendation } from "../../../../lib/gamification";
import { toDateKey } from "../../../../lib/dates";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const recommendation = await ensureRecentRecommendation(auth.user.id);

  if (!recommendation) {
    return NextResponse.json({ recommendation: null });
  }

  return NextResponse.json({
    recommendation: {
      id: recommendation.id,
      weekStartDate: toDateKey(recommendation.weekStartDate),
      compoundIncreasePct: recommendation.compoundIncreasePct,
      accessoryIncreasePct: recommendation.accessoryIncreasePct,
      message: recommendation.message,
      createdAt: recommendation.createdAt.toISOString()
    }
  });
}
