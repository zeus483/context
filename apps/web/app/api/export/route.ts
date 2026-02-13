import { NextResponse } from "next/server";
import { getUserId } from "../../../lib/auth";
import { readData } from "../../../lib/store";

export async function GET() {
  const userId = getUserId();
  const data = await readData();
  const rows = data.sessions.filter((s: any) => s.userId === userId);
  const csv = ["date,status,notes", ...rows.map((r: any) => `${r.date},${r.status},\"${r.notes ?? ""}\"`)].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv" } });
}
