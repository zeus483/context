import { NextResponse } from "next/server";
import { loginUser } from "../../../lib/auth";
import { loginSchema } from "../../../lib/validation";
import { zodToResponse } from "../../../lib/http";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.parse(body);
    const result = await loginUser(parsed.email, parsed.password);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ ok: false, error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
