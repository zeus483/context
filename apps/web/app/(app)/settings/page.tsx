"use client";

import { useEffect, useState } from "react";
import { Nav } from "../../../components/Nav";

type Profile = {
  name: string | null;
  weightKg: number;
  heightCm: number;
  age: number;
  goal: string;
  trainingDays: 5 | 6;
  availableHours: number;
  beachGoalDate: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/profile", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar perfil");
        return res.json();
      })
      .then(setProfile)
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      });

    return () => controller.abort();
  }, []);

  async function saveProfile() {
    if (!profile) return;

    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile)
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo guardar el perfil");
      return;
    }

    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="h1">Ajustes</h1>
        <p className="mt-1 text-sm text-zinc-400">Personaliza días de entrenamiento, meta playa y tus datos físicos.</p>
      </section>

      {profile ? (
        <section className="card space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Peso</label>
              <input
                className="input"
                type="number"
                value={profile.weightKg}
                onChange={(e) => setProfile({ ...profile, weightKg: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Altura</label>
              <input
                className="input"
                type="number"
                value={profile.heightCm}
                onChange={(e) => setProfile({ ...profile, heightCm: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Edad</label>
              <input className="input" type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label className="label">Objetivo</label>
            <input className="input" value={profile.goal} onChange={(e) => setProfile({ ...profile, goal: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Días por semana</label>
              <select
                className="input"
                value={profile.trainingDays}
                onChange={(e) => setProfile({ ...profile, trainingDays: Number(e.target.value) as 5 | 6 })}
              >
                <option value={5}>5 días (Día 6 opcional)</option>
                <option value={6}>6 días</option>
              </select>
            </div>
            <div>
              <label className="label">Horas disponibles</label>
              <select
                className="input"
                value={profile.availableHours}
                onChange={(e) => setProfile({ ...profile, availableHours: Number(e.target.value) })}
              >
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={3}>3 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Fecha objetivo playa</label>
            <input
              className="input"
              type="date"
              value={profile.beachGoalDate}
              onChange={(e) => setProfile({ ...profile, beachGoalDate: e.target.value })}
            />
          </div>

          <button className="btn w-full" type="button" onClick={saveProfile}>
            Guardar cambios
          </button>

          {saved ? <p className="text-sm text-emerald-300">Perfil actualizado.</p> : null}
        </section>
      ) : (
        <section className="card text-sm text-zinc-400">Cargando perfil...</section>
      )}

      <section className="card space-y-2">
        <h2 className="h2">Exportar</h2>
        <div className="grid grid-cols-2 gap-2">
          <a className="btn-secondary" href="/api/export?format=csv">
            Exportar CSV
          </a>
          <a className="btn-secondary" href="/api/export?format=json">
            Exportar JSON
          </a>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="h2">Herramientas</h2>
        <a className="btn-secondary h-11 w-full" href="/tools">
          Abrir calculadoras
        </a>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Nav />
    </div>
  );
}
