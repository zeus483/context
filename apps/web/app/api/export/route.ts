import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { csvFromSessions } from "../../../lib/data";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: "desc" },
    include: {
      workoutDay: true,
      cardioEntry: true,
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }]
      }
    }
  });

  if (format === "json") {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      sessions
    });
  }

  const csv = csvFromSessions(sessions);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=transformacion-2026-sesiones.csv"
    }
  });
}
