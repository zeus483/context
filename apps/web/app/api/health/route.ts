import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "transformacion-2026-web", at: new Date().toISOString() });
}
