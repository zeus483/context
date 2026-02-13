"use client";

import { useEffect, useMemo, useState } from "react";
import { Nav } from "../../../components/Nav";

type ProgressPayload = {
  beach: { daysLeft: number; progressPct: number };
  adherence: { streak: number; complianceLast2WeeksPct: number };
  weight: { id: string; date: string; weightKg: number }[];
  volumeByMuscle: { muscle: string; sets: number }[];
  prs: { key: string; label: string; value: string; date: string | null }[];
  photos: { id: string; date: string; imageUrl: string; privacyNote: string | null }[];
};

function todayDateKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [error, setError] = useState("");
  const [weight, setWeight] = useState(80);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoNote, setPhotoNote] = useState("");

  async function load() {
    const response = await fetch("/api/progress");
    if (!response.ok) {
      throw new Error("No se pudo cargar el progreso");
    }
    const payload = await response.json();
    setData(payload);

    const latestWeight = payload.weight[payload.weight.length - 1];
    if (latestWeight) {
      setWeight(latestWeight.weightKg);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const weightPolyline = useMemo(() => {
    if (!data?.weight.length) {
      return "";
    }

    const values = data.weight;
    const min = Math.min(...values.map((point) => point.weightKg));
    const max = Math.max(...values.map((point) => point.weightKg));

    return values
      .map((point, index) => {
        const x = (index / Math.max(1, values.length - 1)) * 320;
        const y = 90 - ((point.weightKg - min) / Math.max(1, max - min)) * 72;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  async function addWeight() {
    const response = await fetch("/api/weight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: todayDateKey(), weightKg: Number(weight) })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo guardar el peso");
      return;
    }

    await load();
  }

  async function addPhoto() {
    const response = await fetch("/api/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: todayDateKey(), imageUrl: photoUrl, privacyNote: photoNote })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo guardar la foto");
      return;
    }

    setPhotoUrl("");
    setPhotoNote("");
    await load();
  }

  async function removePhoto(id: string) {
    await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Fase playa</p>
            <p className="metric">{data?.beach.daysLeft ?? 0} días</p>
          </div>
          <p className="text-sm text-zinc-300">{data?.beach.progressPct ?? 0}% del bloque</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-zinc-900">
          <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${data?.beach.progressPct ?? 0}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-zinc-400">Racha</p>
          <p className="metric">{data?.adherence.streak ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-zinc-400">Cumplimiento 14d</p>
          <p className="metric">{data?.adherence.complianceLast2WeeksPct ?? 0}%</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Peso corporal</h2>
        <svg viewBox="0 0 320 100" className="w-full rounded-xl bg-zinc-950/70 p-2">
          <polyline fill="none" stroke="#1be48f" strokeWidth="3" points={weightPolyline} />
        </svg>

        <div className="flex gap-2">
          <input className="input" type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          <button className="btn" type="button" onClick={addWeight}>
            Guardar peso
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Volumen semanal (sets por grupo)</h2>
        <div className="space-y-2">
          {data?.volumeByMuscle.map((row) => (
            <div key={row.muscle}>
              <div className="mb-1 flex justify-between text-xs text-zinc-300">
                <span>{row.muscle}</span>
                <span>{row.sets} sets</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, row.sets * 8)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">PRs recientes</h2>
        <div className="grid grid-cols-1 gap-2">
          {data?.prs.map((pr) => (
            <div key={pr.key} className="rounded-xl border border-zinc-800 p-3">
              <p className="text-xs text-zinc-500">{pr.label}</p>
              <p className="text-sm font-semibold">{pr.value}</p>
              <p className="text-xs text-zinc-500">{pr.date ?? "Sin fecha"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Fotos de progreso (privadas)</h2>
        <div className="space-y-2">
          <input
            className="input"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
          <input className="input" value={photoNote} onChange={(e) => setPhotoNote(e.target.value)} placeholder="Nota privada opcional" />
          <button className="btn w-full" type="button" onClick={addPhoto}>
            Guardar foto
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data?.photos.map((photo) => (
            <div key={photo.id} className="rounded-xl border border-zinc-800 p-2">
              <img src={photo.imageUrl} alt={`Progreso ${photo.date}`} className="h-28 w-full rounded-lg object-cover" />
              <p className="mt-1 text-[11px] text-zinc-400">{photo.date}</p>
              {photo.privacyNote ? <p className="text-[11px] text-zinc-500">{photo.privacyNote}</p> : null}
              <button className="mt-1 text-[11px] text-rose-300" type="button" onClick={() => removePhoto(photo.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="h2">Exportar datos</h2>
        <div className="grid grid-cols-2 gap-2">
          <a className="btn-secondary" href="/api/export?format=csv">
            Descargar CSV
          </a>
          <a className="btn-secondary" href="/api/export?format=json">
            Descargar JSON
          </a>
        </div>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Nav />
    </div>
  );
}
