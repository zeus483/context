"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "../../../components/Nav";

function monthKeyNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 7);
}

type CalendarResponse = {
  month: string;
  cells: {
    date: string;
    dayOfMonth: number;
    title: string;
    dayId: string | null;
    status: "DONE" | "PARTIAL" | "REST" | "MISSED" | "PENDING";
    statusLabel: string;
  }[];
  details: {
    date: string;
    label: string;
    sessions: {
      id: string;
      status: string;
      notes: string | null;
      workoutDay: { id: string; title: string };
      cardioEntry: { cardioType: string; minutes: number } | null;
    }[];
  } | null;
};

function statusGlyph(status: string) {
  if (status === "DONE") return "✅";
  if (status === "PARTIAL") return "⚠️";
  if (status === "REST") return "○";
  if (status === "MISSED") return "—";
  return "·";
}

export default function CalendarPage() {
  const [month, setMonth] = useState(monthKeyNow());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams({ month });
    if (selectedDate) query.set("date", selectedDate);

    fetch(`/api/calendar?${query.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar calendario");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [month, selectedDate]);

  const calendarGrid = useMemo(() => {
    if (!data?.cells.length) return [];
    const firstDay = new Date(`${data.cells[0].date}T12:00:00`).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    return [...Array.from({ length: offset }).map(() => null), ...data.cells];
  }, [data]);

  async function handleReprogram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/reprogram", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromDate, toDate })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo reprogramar");
      return;
    }

    setSelectedDate(toDate);
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="h1">Calendario</h1>
          <input className="input w-40" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
          <span>L</span>
          <span>M</span>
          <span>M</span>
          <span>J</span>
          <span>V</span>
          <span>S</span>
          <span>D</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((cell, idx) =>
            cell ? (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`rounded-xl border p-2 text-left text-xs ${
                  selectedDate === cell.date ? "border-emerald-400 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/60"
                }`}
              >
                <p className="font-semibold text-zinc-200">{cell.dayOfMonth}</p>
                <p className="mt-1 text-base">{statusGlyph(cell.status)}</p>
              </button>
            ) : (
              <div key={`empty-${idx}`} />
            )
          )}
        </div>

        <p className="text-xs text-zinc-500">Estados: ✅ Hecho, ⚠️ Parcial, ○ Descanso, — Fallado</p>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Detalle del día</h2>
        {data?.details ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">{data.details.label}</p>
            {data.details.sessions.length ? (
              data.details.sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-zinc-800 p-3 text-sm">
                  <p className="font-medium">{session.workoutDay.title}</p>
                  <p className="text-xs text-zinc-500">Estado: {session.status}</p>
                  <p className="text-xs text-zinc-500">
                    Cardio: {session.cardioEntry ? `${session.cardioEntry.cardioType} ${session.cardioEntry.minutes} min` : "No registrado"}
                  </p>
                  {session.notes ? <p className="mt-1 text-xs text-zinc-400">{session.notes}</p> : null}
                  <Link href={`/session/${session.workoutDay.id}?date=${data.details?.date}`} className="mt-2 inline-flex text-xs text-emerald-300">
                    Editar sesión
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-400">No hay sesión registrada para ese día.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Toca un día para ver resumen y editar.</p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Reprogramar entrenamiento</h2>
        <form className="grid grid-cols-2 gap-3" onSubmit={handleReprogram}>
          <div>
            <label className="label">Mover desde</label>
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Hacia</label>
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
          </div>
          <button className="btn col-span-2" type="submit">
            Aplicar cambio
          </button>
        </form>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Nav />
    </div>
  );
}
