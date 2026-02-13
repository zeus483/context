"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "../../../components/Nav";

type TodayPayload = {
  today: { date: string; dayId: string | null; title: string; focus: string; isRest: boolean; cardioDefault: number };
  tomorrow: { date: string; dayId: string | null; title: string; isRest: boolean };
  week: { date: string; title: string; dayId: string | null; status: string; statusLabel: string }[];
  adherence: { streak: number; complianceLast2WeeksPct: number };
  beach: { daysLeft: number; progressPct: number };
};

export default function TodayPage() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/today")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("No se pudo cargar el resumen de hoy");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
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
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300"
            style={{ width: `${data?.beach.progressPct ?? 0}%` }}
          />
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
        <h1 className="h1">{data?.today.title ?? "Cargando..."}</h1>
        <p className="text-sm text-zinc-300">{data?.today.focus ?? ""}</p>
        {!data?.today.isRest && data?.today.dayId ? (
          <Link href={`/session/${data.today.dayId}?date=${data.today.date}`} className="btn w-full">
            Iniciar entrenamiento
          </Link>
        ) : (
          <div className="rounded-xl border border-zinc-800 px-3 py-3 text-sm text-zinc-300">Hoy es descanso.</div>
        )}
        <p className="text-xs text-zinc-500">Cardio recomendado: {data?.today.cardioDefault ?? 0} min</p>
      </section>

      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Mañana</p>
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 p-3">
          <div>
            <p className="font-medium">{data?.tomorrow.title ?? "-"}</p>
            <p className="text-xs text-zinc-500">{data?.tomorrow.date ?? ""}</p>
          </div>
          {data?.tomorrow.dayId ? (
            <Link className="btn-secondary" href={`/session/${data.tomorrow.dayId}?date=${data.tomorrow.date}`}>
              Preparar
            </Link>
          ) : (
            <span className="text-xs text-zinc-500">Descanso</span>
          )}
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
              <span className="text-xs text-zinc-300">{day.statusLabel}</span>
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Nav />
    </div>
  );
}
