"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function defaultBeachDate() {
  const date = new Date();
  date.setDate(date.getDate() + 56);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@transformacion.app");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("Cristian");
  const [weightKg, setWeightKg] = useState(80);
  const [heightCm, setHeightCm] = useState(175);
  const [age, setAge] = useState(23);
  const [trainingDays, setTrainingDays] = useState<5 | 6>(5);
  const [availableHours, setAvailableHours] = useState(2);
  const [beachGoalDate, setBeachGoalDate] = useState(defaultBeachDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subtitle = useMemo(() => {
    if (mode === "login") {
      return "Ingresa y mira qué toca hoy en segundos.";
    }
    return "Crea tu cuenta y deja listo tu plan fase playa en menos de 1 minuto.";
  }, [mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { email, password }
        : {
            email,
            password,
            profile: {
              name,
              weightKg,
              heightCm,
              age,
              trainingDays,
              availableHours,
              beachGoalDate
            }
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as Record<string, unknown> | null)
        : null;
      const raw = payload ? "" : await response.text().catch(() => "");

      if (!response.ok) {
        const fromPayload = typeof payload?.error === "string" ? payload.error : typeof payload?.message === "string" ? payload.message : "";
        const fallback = raw ? raw.slice(0, 180) : `No se pudo completar la solicitud (${response.status})`;
        setError(fromPayload || fallback);
        return;
      }

      router.replace("/today");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pt-6">
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Transformación 2026</p>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
            Fase playa 8 semanas
          </span>
        </div>
        <h1 className="h1">Entrena con foco y registra progreso real</h1>
        <p className="text-sm text-zinc-300">{subtitle}</p>
      </section>

      <section className="card">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm ${mode === "login" ? "bg-emerald-500 text-zinc-950" : "text-zinc-300"}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-lg px-3 py-2 text-sm ${mode === "register" ? "bg-emerald-500 text-zinc-950" : "text-zinc-300"}`}
          >
            Crear cuenta
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Peso (kg)</label>
                <input className="input" type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} required />
              </div>
              <div>
                <label className="label">Altura (cm)</label>
                <input className="input" type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} required />
              </div>
              <div>
                <label className="label">Edad</label>
                <input className="input" type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} required />
              </div>
              <div>
                <label className="label">Horas disponibles</label>
                <select className="input" value={availableHours} onChange={(e) => setAvailableHours(Number(e.target.value))}>
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={3}>3 horas</option>
                </select>
              </div>
              <div>
                <label className="label">Días/semana</label>
                <select className="input" value={trainingDays} onChange={(e) => setTrainingDays(Number(e.target.value) as 5 | 6)}>
                  <option value={5}>5 días</option>
                  <option value={6}>6 días</option>
                </select>
              </div>
              <div>
                <label className="label">Fecha objetivo playa</label>
                <input className="input" type="date" value={beachGoalDate} onChange={(e) => setBeachGoalDate(e.target.value)} />
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button type="submit" className="btn w-full" disabled={busy}>
            {busy ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      </section>

      <section className="card-muted text-xs text-zinc-400">
        Demo: <span className="text-zinc-200">demo@transformacion.app / demo1234</span>
      </section>
    </div>
  );
}
