import { NextResponse } from "next/server";
import { registerUser } from "../../../../lib/auth";
import { applyRateLimit, databaseErrorToResponse, zodToResponse } from "../../../../lib/http";
import { registerSchema } from "../../../../lib/validation";
import { addDays, todayKey } from "../../../../lib/dates";

export async function POST(req: Request) {
  const limit = applyRateLimit(req, "auth-register", 8, 60_000);
  if (limit) {
    return limit;
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.parse(body);

    const result = await registerUser({
      email: parsed.email,
      password: parsed.password,
      profile: {
        name: parsed.profile?.name,
        weightKg: parsed.profile?.weightKg ?? 80,
        heightCm: parsed.profile?.heightCm ?? 175,
        age: parsed.profile?.age ?? 23,
        trainingDays: parsed.profile?.trainingDays ?? 5,
        availableHours: parsed.profile?.availableHours ?? 2,
        beachGoalDate: parsed.profile?.beachGoalDate ?? addDays(todayKey(), 56)
      }
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("auth.register.error", error);
    return (
      zodToResponse(error) ??
      databaseErrorToResponse(error) ??
      NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 })
    );
  }
}
