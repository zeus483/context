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

export function databaseErrorToResponse(error: unknown) {
  const normalized = error as { message?: string; code?: string; name?: string } | null;
  const message = String(normalized?.message ?? "");
  const code = String(normalized?.code ?? "");
  const name = String(normalized?.name ?? "");

  // Prisma initialization/connectivity failures (credentials, host, TLS, missing env)
  if (
    code === "P1000" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    name === "PrismaClientInitializationError" ||
    message.includes("PrismaClientInitializationError") ||
    message.includes("Can't reach database server") ||
    message.includes("Authentication failed") ||
    message.includes("Environment variable not found") ||
    message.includes("Missing URL environment variable")
  ) {
    return NextResponse.json(
      { error: "No se pudo conectar a la base de datos. Revisa DATABASE_URL en Vercel." },
      { status: 503 }
    );
  }

  // Schema not applied yet in production database
  if (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("The column") ||
    message.includes("does not exist") ||
    message.includes("The table") ||
    (message.includes("relation") && message.includes("does not exist"))
  ) {
    return NextResponse.json(
      { error: "La base de datos no tiene el esquema aplicado. Ejecuta db push contra Supabase." },
      { status: 503 }
    );
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
