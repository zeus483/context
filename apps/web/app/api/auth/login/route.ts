import { NextResponse } from "next/server";
import { loginUser } from "../../../../lib/auth";
import { applyRateLimit, databaseErrorToResponse, zodToResponse } from "../../../../lib/http";
import { loginSchema } from "../../../../lib/validation";

export async function POST(req: Request) {
  const limit = applyRateLimit(req, "auth-login", 15, 60_000);
  if (limit) {
    return limit;
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.parse(body);
    const result = await loginUser(parsed.email, parsed.password);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("auth.login.error", error);
    return (
      zodToResponse(error) ??
      databaseErrorToResponse(error) ??
      NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 })
    );
  }
}
