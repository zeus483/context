"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "../../../components/Nav";

type QuestItem = {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
};

type TodayPayload = {
  activePlan: { id: string; name: string; type: "BASE" | "CUSTOM"; kind: "BEACH" | "NORMAL" | "CUSTOM" };
  today: {
    date: string;
    dayId: string | null;
    planType: "BASE" | "CUSTOM";
    title: string;
    focus: string;
    isRest: boolean;
    cardioDefault: number;
  };
  tomorrow: { date: string; dayId: string | null; planType: "BASE" | "CUSTOM"; title: string; isRest: boolean };
  week: { date: string; title: string; dayId: string | null; planType: "BASE" | "CUSTOM"; status: string; statusLabel: string }[];
  adherence: { streak: number; complianceLast2WeeksPct: number };
  beach: { daysLeft: number; progressPct: number };
  checkin: { weekStartDate: string; weekEndDate: string; pendingCurrentWeek: boolean; pendingPreviousWeek: boolean };
  recommendation: {
    weekStartDate: string;
    compoundIncreasePct: number;
    accessoryIncreasePct: number;
    message: string;
  } | null;
  weightNudge: { daysWithoutLog: number; shouldNudge: boolean };
  gamification: {
    xpTotal: number;
    level: number;
    xpInLevel: number;
    nextLevelXp: number;
    levelProgressPct: number;
    streakCount: number;
    currentTitle: string;
    quests: {
      featured: QuestItem[];
      daily: QuestItem[];
      weekly: QuestItem[];
      monthly: QuestItem[];
    };
  };
};

export default function TodayPage() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [error, setError] = useState("");
  const [checkinScore, setCheckinScore] = useState(6);
  const [fatigueFlag, setFatigueFlag] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/today");
    if (!res.ok) {
      throw new Error("No se pudo cargar el resumen de hoy");
    }
    const payload = await res.json();
    setData(payload);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submitCheckin() {
    setCheckinBusy(true);
    setError("");

    const response = await fetch("/api/checkin/weekly", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        effortScore: checkinScore,
        fatigueFlag
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo guardar check-in");
      setCheckinBusy(false);
      return;
    }

    setCheckinBusy(false);
    await load().catch((err) => setError(err.message));
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Nivel {data?.gamification.level ?? 1}</p>
            <h1 className="h1">{data?.gamification.currentTitle ?? "Recluta"}</h1>
          </div>
          <Link href="/progress" className="btn-secondary">
            Perfil RPG
          </Link>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>XP {data?.gamification.xpInLevel ?? 0}</span>
          <span>{data?.gamification.nextLevelXp ?? 0} para subir</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-900">
          <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" style={{ width: `${data?.gamification.levelProgressPct ?? 0}%` }} />
        </div>
      </section>

      <section className="card space-y-2">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Plan activo</p>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{data?.activePlan.name ?? "-"}</p>
            <p className="text-xs text-zinc-500">
              {data?.activePlan.type === "CUSTOM" ? "Personalizado" : data?.activePlan.kind === "BEACH" ? "Fase Playa" : "Normal Anual"}
            </p>
          </div>
          <Link href="/plans" className="btn-secondary">
            Cambiar
          </Link>
        </div>
      </section>

      <section className="card">
        <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Fase playa</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-sm text-zinc-300">Playa en</p>
            <p className="metric">{data?.beach.daysLeft ?? "--"} días</p>
          </div>
          <p className="text-sm text-zinc-400">{data?.beach.progressPct ?? 0}% completado</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-zinc-900">
          <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" style={{ width: `${data?.beach.progressPct ?? 0}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-zinc-400">Racha actual</p>
          <p className="metric">{data?.adherence.streak ?? 0}</p>
          <p className="text-xs text-zinc-400">días</p>
        </div>
        <div className="card">
          <p className="text-xs text-zinc-400">Cumplimiento (14 días)</p>
          <p className="metric">{data?.adherence.complianceLast2WeeksPct ?? 0}%</p>
        </div>
      </section>

      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Qué toca hoy</p>
        <h2 className="h2">{data?.today.title ?? "Cargando..."}</h2>
        <p className="text-sm text-zinc-300">{data?.today.focus ?? ""}</p>
        {!data?.today.isRest && data?.today.dayId ? (
          <Link href={`/session/${data.today.dayId}?date=${data.today.date}&planType=${data.today.planType}`} className="btn w-full">
            Iniciar entrenamiento
          </Link>
        ) : (
          <div className="rounded-xl border border-zinc-800 px-3 py-3 text-sm text-zinc-300">Hoy es descanso.</div>
        )}
        <p className="text-xs text-zinc-500">Cardio recomendado: {data?.today.cardioDefault ?? 0} min</p>
      </section>

      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Check-in semanal</p>
        {data?.checkin.pendingCurrentWeek ? (
          <div className="space-y-2">
            <label className="label">Esfuerzo percibido (1-10)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={checkinScore}
              onChange={(e) => setCheckinScore(Number(e.target.value))}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={fatigueFlag} onChange={(e) => setFatigueFlag(e.target.checked)} />
              Fatiga alta esta semana
            </label>
            <button className="btn w-full" type="button" onClick={submitCheckin} disabled={checkinBusy}>
              {checkinBusy ? "Guardando..." : "Guardar check-in"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-emerald-300">Check-in semanal completado.</p>
        )}
        {data?.checkin.pendingPreviousWeek ? (
          <p className="text-xs text-amber-300">Tienes check-in pendiente de la semana anterior.</p>
        ) : null}
      </section>

      {data?.recommendation ? (
        <section className="card space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Recomendación entrenador</p>
          <p className="text-sm text-zinc-200">{data.recommendation.message}</p>
          <p className="text-xs text-zinc-500">
            Compuestos: {data.recommendation.compoundIncreasePct >= 0 ? "+" : ""}
            {data.recommendation.compoundIncreasePct}% · Aislados: {data.recommendation.accessoryIncreasePct >= 0 ? "+" : ""}
            {data.recommendation.accessoryIncreasePct}%
          </p>
        </section>
      ) : null}

      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Quests destacadas</p>
        <div className="space-y-2">
          {(data?.gamification.quests.featured ?? []).map((quest) => {
            const pct = Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100));
            return (
              <div key={quest.id} className="rounded-xl border border-zinc-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{quest.name}</p>
                  <span className="text-xs text-emerald-300">+{quest.xpReward} XP</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{quest.description}</p>
                <div className="mt-2 h-2 rounded-full bg-zinc-900">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {quest.progress}/{quest.target} {quest.completed ? "· Completada" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Esta semana</p>
        <div className="space-y-2">
          {data?.week.map((day) => (
            <div key={day.date} className="flex items-center justify-between rounded-xl border border-zinc-800 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{day.title}</p>
                <p className="text-xs text-zinc-500">{day.date}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-300">{day.statusLabel}</p>
                {day.dayId ? (
                  <Link href={`/session/${day.dayId}?date=${day.date}&planType=${day.planType}`} className="text-[11px] text-emerald-300">
                    Abrir
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {data?.weightNudge.shouldNudge ? (
        <section className="card-muted text-sm text-amber-300">
          Llevas {data.weightNudge.daysWithoutLog} días sin registrar peso. Haz un registro rápido en Progreso.
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Nav />
    </div>
  );
}
