import { NextResponse } from "next/server";
import { getUserId } from "../../../lib/auth";
import { readData, writeData } from "../../../lib/store";

export async function POST(req: Request) {
  const userId = getUserId();
  const body = await req.json();
  const data = await readData();
  data.bodyWeights.push({ userId, date: body.date, weightKg: body.weightKg });
  await writeData(data);
  return NextResponse.json({ ok: true });
}
