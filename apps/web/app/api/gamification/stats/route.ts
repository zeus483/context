import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { unauthorized } from "../../../../lib/http";
import { refreshGamification } from "../../../../lib/gamification";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const snapshot = await refreshGamification(auth.user.id);
  return NextResponse.json(snapshot);
}
