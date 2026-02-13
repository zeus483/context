import { NextResponse } from "next/server";
import { login } from "../../../lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const ok = await login(body.email, body.password);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
