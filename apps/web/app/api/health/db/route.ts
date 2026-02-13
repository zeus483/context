import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { databaseErrorToResponse } from "../../../../lib/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", at: new Date().toISOString() });
  } catch (error) {
    console.error("health.db.error", error);
    return (
      databaseErrorToResponse(error) ??
      NextResponse.json({ ok: false, db: "down", error: "No se pudo conectar a DB" }, { status: 503 })
    );
  }
}
