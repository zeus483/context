import crypto from "crypto";
import { NextResponse } from "next/server";
import { getUserId } from "../../../lib/auth";
import { readData, writeData } from "../../../lib/store";

export async function POST(req: Request) {
  const userId = getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const data = await readData();
  const record = { id: crypto.randomUUID(), userId, date: new Date().toISOString(), ...body, status: body.sets?.every((s: any) => s.completed) ? "DONE" : "PARTIAL" };
  data.sessions.unshift(record);
  await writeData(data);
  return NextResponse.json(record);
}
