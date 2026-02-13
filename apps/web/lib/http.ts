import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkRateLimit } from "./rate-limit";

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}

export function forbidden(message = "Acción no permitida") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function tooManyRequests(resetAt: number) {
  return NextResponse.json(
    { error: "Demasiadas solicitudes, intenta de nuevo en unos segundos" },
    {
      status: 429,
      headers: {
        "retry-after": Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)).toString()
      }
    }
  );
}

export function serverError(message = "Error interno") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function zodToResponse(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest("Payload inválido", error.flatten());
  }
  return null;
}

export function applyRateLimit(request: Request, scope: string, limit = 50, windowMs = 60_000) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  const key = `${scope}:${ip}`;
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.ok) {
    return tooManyRequests(result.resetAt);
  }
  return null;
}
