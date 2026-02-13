"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "../../../../components/Nav";

type TemplateResponse = {
  date: string;
  day: {
    id: string;
    planType: "BASE" | "CUSTOM";
    planId: string;
    title: string;
    focus: string;
    cardioDefault: number;
    exercises: {
      exerciseId: string;
      name: string;
      muscleGroup: string;
      equipment: string;
      instructions: string;
      suggestedSets: number;
      suggestedReps: string;
      suggestedRestSec: number;
      previous: { weightKg: number | null; reps: number | null };
    }[];
  };
  session: {
    id: string;
    status: string;
    notes: string | null;
    cardio: { cardioType: string; minutes: number; intensity: "LOW" | "MEDIUM" | "HIGH"; reasonIfZero: string | null } | null;
    sets: {
      exerciseId: string;
      setNumber: number;
      weightKg: number | null;
      reps: number | null;
      rir: number | null;
      notes: string | null;
      completed: boolean;
    }[];
  } | null;
};

type SetInput = {
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  notes: string | null;
  completed: boolean;
};

export function SessionForm({
  dayId,
  dateKey,
  planType
}: {
  dayId: string;
  dateKey?: string;
  planType?: "BASE" | "CUSTOM";
}) {
  const [resolvedDate] = useState(() => {
    if (dateKey) return dateKey;
    const date = new Date();
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  });
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [sets, setSets] = useState<SetInput[]>([]);
  const [notes, setNotes] = useState("");
  const [cardioType, setCardioType] = useState("Caminata inclinada");
  const [cardioMinutes, setCardioMinutes] = useState(15);
  const [cardioIntensity, setCardioIntensity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [cardioReason, setCardioReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [xpGain, setXpGain] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  const dirtyRef = useRef(false);
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ dayId, date: resolvedDate });
    if (planType) {
      params.set("planType", planType);
    }

    fetch(`/api/session/template?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("No se pudo cargar la sesión");
        }
        return res.json() as Promise<TemplateResponse>;
      })
      .then((payload) => {
        setTemplate(payload);
        setStartedAt(Date.now());

        if (payload.session?.sets?.length) {
          setSets(
            payload.session.sets.map((set) => ({
              exerciseId: set.exerciseId,
              setNumber: set.setNumber,
              weightKg: set.weightKg,
              reps: set.reps,
              rir: set.rir,
              notes: set.notes,
              completed: set.completed
            }))
          );
        } else {
          const generated = payload.day.exercises.flatMap((exercise) =>
            Array.from({ length: exercise.suggestedSets }).map((_, idx) => ({
              exerciseId: exercise.exerciseId,
              setNumber: idx + 1,
              weightKg: exercise.previous.weightKg,
              reps: exercise.previous.reps,
              rir: 2,
              notes: "",
              completed: false
            }))
          );
          setSets(generated);
        }

        setNotes(payload.session?.notes ?? "");
        setCardioType(payload.session?.cardio?.cardioType ?? "Caminata inclinada");
        setCardioMinutes(payload.session?.cardio?.minutes ?? payload.day.cardioDefault ?? 15);
        setCardioIntensity(payload.session?.cardio?.intensity ?? "MEDIUM");
        setCardioReason(payload.session?.cardio?.reasonIfZero ?? "");
        initialLoadedRef.current = true;
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      });

    return () => controller.abort();
  }, [resolvedDate, dayId, planType]);

  const setsByExercise = useMemo(() => {
    if (!template) {
      return [];
    }

    return template.day.exercises.map((exercise) => ({
      ...exercise,
      sets: sets.filter((set) => set.exerciseId === exercise.exerciseId)
    }));
  }, [sets, template]);

  async function persistSession(finalize = false) {
    if (!template || !initialLoadedRef.current) {
      return;
    }

    setSaving(true);
    setError("");

    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000));

    const response = await fetch("/api/session", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: template.date,
        planType: template.day.planType,
        planId: template.day.planId,
        dayId: template.day.id,
        notes,
        durationMinutes,
        finalize,
        cardio: {
          cardioType,
          minutes: cardioMinutes,
          intensity: cardioIntensity,
          reasonIfZero: cardioReason || undefined
        },
        sets
      })
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo guardar");
      return;
    }

    setSavedAt(new Date().toLocaleTimeString("es-CO"));
    dirtyRef.current = false;
    setXpGain(payload.xpGain ?? 0);
  }

  useEffect(() => {
    if (!initialLoadedRef.current) {
      return;
    }
    dirtyRef.current = true;
    const timeout = setTimeout(() => {
      if (dirtyRef.current) {
        persistSession(false);
      }
    }, 1400);

    return () => clearTimeout(timeout);
  }, [sets, notes, cardioType, cardioMinutes, cardioIntensity, cardioReason]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current) {
        persistSession(false);
      }
    }, 9000);

    return () => clearInterval(timer);
  }, []);

  function updateSet(target: SetInput, patch: Partial<SetInput>) {
    setSets((current) =>
      current.map((entry) =>
        entry.exerciseId === target.exerciseId && entry.setNumber === target.setNumber ? { ...entry, ...patch } : entry
      )
    );
  }

  return (
    <div className="space-y-4">
      {xpGain > 0 ? <div className="card-muted text-sm text-emerald-300">+{xpGain} XP</div> : null}

      <section className="card">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Registro de sesión</p>
        <h1 className="h1 mt-1">{template?.day.title ?? "Cargando..."}</h1>
        <p className="text-sm text-zinc-300">{template?.day.focus ?? ""}</p>
        <p className="mt-1 text-xs text-zinc-500">Fecha: {template?.date ?? resolvedDate}</p>
        <p className="mt-1 text-xs text-emerald-300">Plan {template?.day.planType === "CUSTOM" ? "Personalizado" : "Base"}</p>
      </section>

      {setsByExercise.map((exercise) => (
        <section key={exercise.exerciseId} className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="h2">{exercise.name}</h2>
              <p className="text-xs text-zinc-500">
                {exercise.suggestedSets} x {exercise.suggestedReps} · descanso {exercise.suggestedRestSec}s
              </p>
            </div>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{exercise.muscleGroup}</span>
          </div>

          <p className="text-xs text-zinc-400">
            Última referencia: {exercise.previous.weightKg ?? "-"} kg x {exercise.previous.reps ?? "-"}
          </p>

          <div className="space-y-2">
            {exercise.sets.map((set) => (
              <div key={`${set.exerciseId}-${set.setNumber}`} className="grid grid-cols-12 gap-2 rounded-xl border border-zinc-800 p-2 text-sm">
                <div className="col-span-12 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Set {set.setNumber}</span>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={set.completed}
                      onChange={(event) => updateSet(set, { completed: event.target.checked })}
                    />
                    Completado
                  </label>
                </div>

                <div className="col-span-4">
                  <label className="label">Kg</label>
                  <input
                    className="input"
                    type="number"
                    value={set.weightKg ?? ""}
                    onChange={(event) => updateSet(set, { weightKg: event.target.value ? Number(event.target.value) : null })}
                  />
                </div>
                <div className="col-span-4">
                  <label className="label">Reps</label>
                  <input
                    className="input"
                    type="number"
                    value={set.reps ?? ""}
                    onChange={(event) => updateSet(set, { reps: event.target.value ? Number(event.target.value) : null })}
                  />
                </div>
                <div className="col-span-4">
                  <label className="label">RIR</label>
                  <input
                    className="input"
                    type="number"
                    value={set.rir ?? ""}
                    onChange={(event) => updateSet(set, { rir: event.target.value ? Number(event.target.value) : null })}
                  />
                </div>
                <div className="col-span-12">
                  <label className="label">Nota del set</label>
                  <input
                    className="input"
                    value={set.notes ?? ""}
                    onChange={(event) => updateSet(set, { notes: event.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card space-y-3">
        <h2 className="h2">Cardio final</h2>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={cardioType} onChange={(e) => setCardioType(e.target.value)}>
            <option>Caminata inclinada</option>
            <option>Bici</option>
            <option>HIIT ligero</option>
            <option>Remo</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Minutos</label>
            <input className="input" type="number" min={0} value={cardioMinutes} onChange={(e) => setCardioMinutes(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Intensidad</label>
            <select className="input" value={cardioIntensity} onChange={(e) => setCardioIntensity(e.target.value as "LOW" | "MEDIUM" | "HIGH")}> 
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>
        </div>
        {cardioMinutes === 0 ? (
          <div>
            <label className="label">Motivo si cardio = 0</label>
            <input className="input" value={cardioReason} onChange={(e) => setCardioReason(e.target.value)} placeholder="Ej: no hubo tiempo" />
          </div>
        ) : null}
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Notas generales</h2>
        <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sensaciones, técnica, molestias..." />

        <button type="button" className="btn w-full" onClick={() => persistSession(true)} disabled={saving}>
          {saving ? "Guardando..." : "Guardar sesión"}
        </button>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{savedAt ? `Autoguardado: ${savedAt}` : "Autoguardado activo"}</span>
          <Link className="text-emerald-300" href="/calendar">
            Ver calendario
          </Link>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </section>

      <Nav />
    </div>
  );
}
