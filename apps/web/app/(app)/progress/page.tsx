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
  weeklyRecommendation: {
    weekStartDate: string;
    compoundIncreasePct: number;
    accessoryIncreasePct: number;
    message: string;
  } | null;
  weeklyCheckins: {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    effortScore: number;
    fatigueFlag: boolean;
  }[];
  gamification: {
    xpTotal: number;
    level: number;
    xpInLevel: number;
    nextLevelXp: number;
    levelProgressPct: number;
    streakCount: number;
    currentTitle: string;
    quests: {
      daily: { id: string; name: string; progress: number; target: number; completed: boolean }[];
      weekly: { id: string; name: string; progress: number; target: number; completed: boolean }[];
      monthly: { id: string; name: string; progress: number; target: number; completed: boolean }[];
    };
    unlockedTitles: string[];
    unlockedBadges: { name: string; description: string; iconKey: string; unlockedAt: string }[];
  };
};

type TitlePayload = {
  currentTitleId: string | null;
  currentTitle: string | null;
  unlockedTitles: { id: string; name: string; description: string; unlockedAt: string }[];
};

function getTodayDateKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [titles, setTitles] = useState<TitlePayload | null>(null);
  const [error, setError] = useState("");
  const [weight, setWeight] = useState(80);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedTitleId, setSelectedTitleId] = useState("");

  async function load() {
    const [progressRes, titlesRes] = await Promise.all([fetch("/api/progress"), fetch("/api/gamification/titles")]);

    if (!progressRes.ok) {
      throw new Error("No se pudo cargar el progreso");
    }

    if (!titlesRes.ok) {
      throw new Error("No se pudo cargar títulos");
    }

    const [progressPayload, titlesPayload] = await Promise.all([progressRes.json(), titlesRes.json()]);
    setData(progressPayload);
    setTitles(titlesPayload);
    setSelectedTitleId(titlesPayload.currentTitleId ?? "");

    const latestWeight = progressPayload.weight[progressPayload.weight.length - 1];
    if (latestWeight) {
      setWeight(latestWeight.weightKg);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/progress", { signal: controller.signal }),
      fetch("/api/gamification/titles", { signal: controller.signal })
    ])
      .then(async ([progressRes, titlesRes]) => {
        if (!progressRes.ok) throw new Error("No se pudo cargar el progreso");
        if (!titlesRes.ok) throw new Error("No se pudo cargar títulos");

        const [progressPayload, titlesPayload] = await Promise.all([progressRes.json(), titlesRes.json()]);
        setData(progressPayload);
        setTitles(titlesPayload);
        setSelectedTitleId(titlesPayload.currentTitleId ?? "");

        const latestWeight = progressPayload.weight[progressPayload.weight.length - 1];
        if (latestWeight) setWeight(latestWeight.weightKg);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      });

    return () => controller.abort();
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
      body: JSON.stringify({ date: getTodayDateKey(), weightKg: Number(weight) })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo guardar el peso");
      return;
    }

    await load();
  }

  async function addPhoto() {
    if (!photoFile) {
      setError("Selecciona una foto primero");
      return;
    }

    setUploadingPhoto(true);
    setError("");

    const formData = new FormData();
    formData.append("file", photoFile);
    formData.append("date", getTodayDateKey());
    if (photoNote) formData.append("privacyNote", photoNote);

    const response = await fetch("/api/photos", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo guardar la foto");
      setUploadingPhoto(false);
      return;
    }

    setPhotoFile(null);
    setPhotoNote("");
    setUploadingPhoto(false);
    await load();
  }

  async function removePhoto(id: string) {
    await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function updateActiveTitle() {
    if (!selectedTitleId) {
      return;
    }

    const response = await fetch("/api/gamification/titles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titleId: selectedTitleId })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo cambiar título");
      return;
    }

    await load();
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Perfil RPG</p>
            <p className="h2">Nivel {data?.gamification.level ?? 1}</p>
            <p className="text-sm text-zinc-300">{data?.gamification.currentTitle ?? "Recluta"}</p>
          </div>
          <p className="text-sm text-zinc-400">XP total {data?.gamification.xpTotal ?? 0}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{data?.gamification.xpInLevel ?? 0} XP</span>
          <span>{data?.gamification.nextLevelXp ?? 0} para nivel siguiente</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-900">
          <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" style={{ width: `${data?.gamification.levelProgressPct ?? 0}%` }} />
        </div>
      </section>

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

      {data?.weeklyRecommendation ? (
        <section className="card space-y-2">
          <h2 className="h2">Recomendación semanal</h2>
          <p className="text-sm text-zinc-300">{data.weeklyRecommendation.message}</p>
          <p className="text-xs text-zinc-500">
            Compuestos {data.weeklyRecommendation.compoundIncreasePct >= 0 ? "+" : ""}
            {data.weeklyRecommendation.compoundIncreasePct}% · Aislados {data.weeklyRecommendation.accessoryIncreasePct >= 0 ? "+" : ""}
            {data.weeklyRecommendation.accessoryIncreasePct}%
          </p>
        </section>
      ) : null}

      <section className="card space-y-3">
        <h2 className="h2">Título activo</h2>
        <div className="grid grid-cols-[1fr,auto] gap-2">
          <select className="input" value={selectedTitleId} onChange={(e) => setSelectedTitleId(e.target.value)}>
            <option value="">Selecciona un título</option>
            {titles?.unlockedTitles.map((title) => (
              <option key={title.id} value={title.id}>
                {title.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="button" onClick={updateActiveTitle}>
            Aplicar
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Quests</h2>
        <div className="space-y-2">
          {[...(data?.gamification.quests.daily ?? []), ...(data?.gamification.quests.weekly ?? []), ...(data?.gamification.quests.monthly ?? [])].map(
            (quest) => (
              <div key={quest.id} className="rounded-xl border border-zinc-800 p-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{quest.name}</p>
                  <p className="text-xs text-zinc-500">
                    {quest.progress}/{quest.target}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-900">
                  <div
                    className="h-2 rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100))}%` }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Badges desbloqueados</h2>
        <div className="grid grid-cols-1 gap-2">
          {(data?.gamification.unlockedBadges ?? []).map((badge) => (
            <div key={badge.iconKey} className="rounded-xl border border-zinc-800 p-3">
              <p className="text-sm font-medium">{badge.name}</p>
              <p className="text-xs text-zinc-500">{badge.description}</p>
            </div>
          ))}
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
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
          <input className="input" value={photoNote} onChange={(e) => setPhotoNote(e.target.value)} placeholder="Nota privada opcional" />
          <button className="btn w-full" type="button" onClick={addPhoto} disabled={uploadingPhoto || !photoFile}>
            {uploadingPhoto ? "Subiendo..." : "Guardar foto"}
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
