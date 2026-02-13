"use client";

import { useEffect, useMemo, useState } from "react";
import { Nav } from "../../../components/Nav";

type ExerciseOption = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
};

type PlanDay = {
  id: string;
  order: number;
  title: string;
  focus: string;
  cardioDefault: number;
  isOptional: boolean;
};

type PlanResponse = {
  id: string;
  planType: "BASE" | "CUSTOM";
  kind: "BEACH" | "NORMAL" | "CUSTOM";
  name: string;
  description: string | null;
  selector: {
    activePlanType: "BASE" | "CUSTOM";
    activeBasePlanId: string | null;
    activeCustomPlanId: string | null;
    basePlans: {
      id: string;
      code: string;
      kind: "BEACH" | "NORMAL";
      name: string;
      description: string;
      isActive: boolean;
      days: PlanDay[];
    }[];
    customPlans: {
      id: string;
      name: string;
      description: string | null;
      isArchived: boolean;
      isActive: boolean;
      warning: string | null;
      days: PlanDay[];
    }[];
  };
};

type CustomPlanDetail = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  warning: string | null;
  days: {
    id: string;
    order: number;
    name: string;
    focus: string;
    cardioDefault: number;
    isOptional: boolean;
    exercises: {
      id: string;
      order: number;
      exerciseId: string;
      name: string;
      muscleGroup: string;
      equipment: string;
      sets: number;
      reps: string;
      restSeconds: number;
    }[];
  }[];
};

type DraftExercise = {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

type DraftDay = {
  name: string;
  focus: string;
  cardioDefault: number;
  isOptional: boolean;
  exercises: DraftExercise[];
};

type DraftPlan = {
  id?: string;
  name: string;
  description: string;
  days: DraftDay[];
};

function emptyDraft(exerciseId?: string): DraftPlan {
  return {
    name: "Mi nueva rutina",
    description: "",
    days: [
      {
        name: "Día 1",
        focus: "Foco principal",
        cardioDefault: 15,
        isOptional: false,
        exercises: exerciseId
          ? [
              {
                exerciseId,
                sets: 3,
                reps: "8-12",
                restSeconds: 90
              }
            ]
          : []
      }
    ]
  };
}

export default function PlansPage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [editor, setEditor] = useState<DraftPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function load() {
    setError("");
    const [planRes, exercisesRes] = await Promise.all([fetch("/api/plan"), fetch("/api/exercises")]);

    if (!planRes.ok) {
      throw new Error("No se pudo cargar planes");
    }

    if (!exercisesRes.ok) {
      throw new Error("No se pudo cargar biblioteca de ejercicios");
    }

    const [planPayload, exercisesPayload] = await Promise.all([planRes.json(), exercisesRes.json()]);
    setData(planPayload);
    setExercises(exercisesPayload.exercises ?? []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const lowerDayWarning = useMemo(() => {
    if (!editor) {
      return "";
    }
    const lower = editor.days.filter((day) => {
      const probe = `${day.name} ${day.focus}`.toLowerCase();
      return ["pierna", "femoral", "glúte", "tren inferior"].some((token) => probe.includes(token));
    }).length;

    if (lower > 2) {
      return `Advertencia: tienes ${lower} días de tren inferior (recomendado máximo 2).`;
    }
    return "";
  }, [editor]);

  async function switchPlan(planType: "BASE" | "CUSTOM", planId: string) {
    setBusy(true);
    setError("");
    setInfo("");

    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "switch", planType, planId })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo activar el plan");
      setBusy(false);
      return;
    }

    setInfo("Plan activo actualizado.");
    setBusy(false);
    await load().catch((err) => setError(err.message));
  }

  async function duplicatePlan(sourcePlanType: "BASE" | "CUSTOM", sourcePlanId: string, sourceName: string) {
    setBusy(true);
    setError("");
    setInfo("");

    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "duplicate", sourcePlanType, sourcePlanId, name: `${sourceName} (Copia)` })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo duplicar");
      setBusy(false);
      return;
    }

    setInfo("Plan duplicado en Mis Rutinas.");
    setBusy(false);
    await load().catch((err) => setError(err.message));
  }

  function startCreate() {
    setEditor(emptyDraft(exercises[0]?.id));
    setInfo("");
    setError("");
  }

  async function startEdit(planId: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/custom-plans?id=${planId}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "No se pudo cargar la rutina");
      setBusy(false);
      return;
    }

    const detail = payload as CustomPlanDetail;

    setEditor({
      id: detail.id,
      name: detail.name,
      description: detail.description ?? "",
      days: detail.days.map((day) => ({
        name: day.name,
        focus: day.focus,
        cardioDefault: day.cardioDefault,
        isOptional: day.isOptional,
        exercises: day.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds
        }))
      }))
    });

    setBusy(false);
  }

  async function saveDraft() {
    if (!editor) {
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");

    const response = await fetch("/api/custom-plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editor)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "No se pudo guardar la rutina personalizada");
      setBusy(false);
      return;
    }

    setInfo(payload.versionedFromPlanId ? "Rutina actualizada con versionado (historial preservado)." : "Rutina guardada.");
    setEditor(null);
    setBusy(false);
    await load().catch((err) => setError(err.message));
  }

  async function removeCustomPlan(planId: string) {
    setBusy(true);
    setError("");
    setInfo("");

    const response = await fetch(`/api/custom-plans?id=${planId}`, {
      method: "DELETE"
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "No se pudo eliminar/archivar la rutina");
      setBusy(false);
      return;
    }

    if (payload.archived) {
      setInfo("La rutina tenía sesiones históricas: se archivó sin borrar historial.");
    } else {
      setInfo("Rutina eliminada.");
    }

    setBusy(false);
    await load().catch((err) => setError(err.message));
  }

  function updateDay(dayIndex: number, patch: Partial<DraftDay>) {
    if (!editor) {
      return;
    }

    setEditor({
      ...editor,
      days: editor.days.map((day, index) => (index === dayIndex ? { ...day, ...patch } : day))
    });
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<DraftExercise>) {
    if (!editor) {
      return;
    }

    setEditor({
      ...editor,
      days: editor.days.map((day, index) => {
        if (index !== dayIndex) {
          return day;
        }

        return {
          ...day,
          exercises: day.exercises.map((exercise, idx) => (idx === exerciseIndex ? { ...exercise, ...patch } : exercise))
        };
      })
    });
  }

  function addDay() {
    if (!editor) {
      return;
    }

    setEditor({
      ...editor,
      days: [
        ...editor.days,
        {
          name: `Día ${editor.days.length + 1}`,
          focus: "Nuevo enfoque",
          cardioDefault: 15,
          isOptional: false,
          exercises: exercises[0]
            ? [
                {
                  exerciseId: exercises[0].id,
                  sets: 3,
                  reps: "8-12",
                  restSeconds: 90
                }
              ]
            : []
        }
      ]
    });
  }

  function removeDay(dayIndex: number) {
    if (!editor || editor.days.length === 1) {
      return;
    }

    setEditor({
      ...editor,
      days: editor.days.filter((_, index) => index !== dayIndex)
    });
  }

  function moveDay(dayIndex: number, direction: -1 | 1) {
    if (!editor) {
      return;
    }

    const nextIndex = dayIndex + direction;
    if (nextIndex < 0 || nextIndex >= editor.days.length) {
      return;
    }

    const cloned = [...editor.days];
    const [removed] = cloned.splice(dayIndex, 1);
    cloned.splice(nextIndex, 0, removed);

    setEditor({ ...editor, days: cloned });
  }

  function addExercise(dayIndex: number) {
    if (!editor || !exercises.length) {
      return;
    }

    const fallback = exercises[0];

    setEditor({
      ...editor,
      days: editor.days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  exerciseId: fallback.id,
                  sets: 3,
                  reps: "8-12",
                  restSeconds: 90
                }
              ]
            }
          : day
      )
    });
  }

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    if (!editor) {
      return;
    }

    setEditor({
      ...editor,
      days: editor.days.map((day, index) => {
        if (index !== dayIndex) {
          return day;
        }

        return {
          ...day,
          exercises: day.exercises.filter((_, idx) => idx !== exerciseIndex)
        };
      })
    });
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <section className="card">Cargando planes...</section>
        <Nav />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Selector de plan</p>
        <h1 className="h1">Plan activo: {data.name}</h1>
        <p className="text-sm text-zinc-400">
          Tipo {data.planType} · {data.kind === "CUSTOM" ? "Personalizado" : data.kind === "BEACH" ? "Fase Playa" : "Normal Anual"}
        </p>
        <button className="btn w-full" type="button" onClick={startCreate} disabled={busy}>
          Crear rutina personalizada
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Planes base</h2>
        <div className="space-y-2">
          {data.selector.basePlans.map((plan) => (
            <article key={plan.id} className="rounded-xl border border-zinc-800 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="text-xs text-zinc-500">{plan.description}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{plan.days.length} días</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className={plan.isActive ? "btn-secondary" : "btn"}
                    type="button"
                    disabled={busy || plan.isActive}
                    onClick={() => switchPlan("BASE", plan.id)}
                  >
                    {plan.isActive ? "Activo" : "Activar"}
                  </button>
                  <button className="btn-secondary" type="button" disabled={busy} onClick={() => duplicatePlan("BASE", plan.id, plan.name)}>
                    Duplicar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Mis rutinas personalizadas</h2>
        <div className="space-y-2">
          {data.selector.customPlans.length ? (
            data.selector.customPlans.map((plan) => (
              <article key={plan.id} className="rounded-xl border border-zinc-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-xs text-zinc-500">{plan.description ?? "Sin descripción"}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {plan.days.length} días · {plan.isArchived ? "Archivado" : "Disponible"}
                    </p>
                    {plan.warning ? <p className="mt-1 text-[11px] text-amber-300">{plan.warning}</p> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      className={plan.isActive ? "btn-secondary" : "btn"}
                      type="button"
                      disabled={busy || plan.isArchived || plan.isActive}
                      onClick={() => switchPlan("CUSTOM", plan.id)}
                    >
                      {plan.isActive ? "Activo" : "Activar"}
                    </button>
                    <button className="btn-secondary" type="button" disabled={busy || plan.isArchived} onClick={() => startEdit(plan.id)}>
                      Editar
                    </button>
                    <button className="btn-secondary" type="button" disabled={busy} onClick={() => duplicatePlan("CUSTOM", plan.id, plan.name)}>
                      Duplicar
                    </button>
                    <button className="btn-secondary" type="button" disabled={busy} onClick={() => removeCustomPlan(plan.id)}>
                      {plan.isArchived ? "Quitar" : "Eliminar/Archivar"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-zinc-400">Aún no tienes rutinas personalizadas.</p>
          )}
        </div>
      </section>

      {editor ? (
        <section className="card space-y-3">
          <h2 className="h2">{editor.id ? "Editar rutina" : "Nueva rutina"}</h2>

          <div>
            <label className="label">Nombre</label>
            <input className="input" value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
          </div>

          <div>
            <label className="label">Descripción</label>
            <input className="input" value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
          </div>

          {editor.days.map((day, dayIndex) => (
            <article key={`day-${dayIndex}`} className="rounded-xl border border-zinc-800 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Día {dayIndex + 1}</p>
                <div className="flex gap-1">
                  <button className="btn-secondary" type="button" onClick={() => moveDay(dayIndex, -1)}>
                    ↑
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => moveDay(dayIndex, 1)}>
                    ↓
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => removeDay(dayIndex)}>
                    Quitar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="label">Nombre del día</label>
                  <input className="input" value={day.name} onChange={(e) => updateDay(dayIndex, { name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Foco</label>
                  <input className="input" value={day.focus} onChange={(e) => updateDay(dayIndex, { focus: e.target.value })} />
                </div>
                <div>
                  <label className="label">Cardio (min)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={60}
                    value={day.cardioDefault}
                    onChange={(e) => updateDay(dayIndex, { cardioDefault: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={day.isOptional}
                      onChange={(e) => updateDay(dayIndex, { isOptional: e.target.checked })}
                    />
                    Día opcional
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Ejercicios</p>
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={`exercise-${exerciseIndex}`} className="grid grid-cols-12 gap-2 rounded-lg border border-zinc-800 p-2">
                    <div className="col-span-12">
                      <label className="label">Ejercicio</label>
                      <select
                        className="input"
                        value={exercise.exerciseId}
                        onChange={(e) => updateExercise(dayIndex, exerciseIndex, { exerciseId: e.target.value })}
                      >
                        {exercises.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} · {option.muscleGroup}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="label">Sets</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={12}
                        value={exercise.sets}
                        onChange={(e) => updateExercise(dayIndex, exerciseIndex, { sets: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="label">Reps</label>
                      <input
                        className="input"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(dayIndex, exerciseIndex, { reps: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="label">Descanso</label>
                      <input
                        className="input"
                        type="number"
                        min={15}
                        max={300}
                        value={exercise.restSeconds}
                        onChange={(e) => updateExercise(dayIndex, exerciseIndex, { restSeconds: Number(e.target.value) })}
                      />
                    </div>
                    <button className="btn-secondary col-span-12" type="button" onClick={() => removeExercise(dayIndex, exerciseIndex)}>
                      Quitar ejercicio
                    </button>
                  </div>
                ))}
                <button className="btn-secondary w-full" type="button" onClick={() => addExercise(dayIndex)}>
                  Agregar ejercicio
                </button>
              </div>
            </article>
          ))}

          <button className="btn-secondary w-full" type="button" onClick={addDay}>
            Agregar día
          </button>

          {lowerDayWarning ? <p className="text-sm text-amber-300">{lowerDayWarning}</p> : null}

          <div className="grid grid-cols-2 gap-2">
            <button className="btn" type="button" disabled={busy} onClick={saveDraft}>
              {busy ? "Guardando..." : "Guardar rutina"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setEditor(null)}>
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-300">{info}</p> : null}

      <Nav />
    </div>
  );
}
