import { NextResponse } from "next/server";
import { getUserId } from "../../../lib/auth";
import { readData } from "../../../lib/store";

export async function GET() {
  const userId = getUserId();
  const data = await readData();
  return NextResponse.json({
    weight: data.bodyWeights.filter((w: any) => w.userId === userId),
    volume: data.sessions.filter((s: any) => s.userId === userId).length
  });
}
