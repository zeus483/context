import { NextResponse } from "next/server";
import { getAuthContext, logoutUser } from "../../../../lib/auth";

export async function POST() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await logoutUser();
  return NextResponse.json({ ok: true });
}