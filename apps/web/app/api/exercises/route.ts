import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      muscleGroup: true,
      equipment: true
    }
  });

  return NextResponse.json({ exercises });
}
