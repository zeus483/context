import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: "Usa /api/auth/login, /api/auth/register y /api/auth/logout."
    },
    { status: 410 }
  );
}

export const POST = GET;
export const DELETE = GET;
