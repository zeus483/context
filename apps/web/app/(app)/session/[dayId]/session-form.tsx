"use client";
import { useState } from "react";

export function SessionForm({ day }: { day: any }) {
  const [notes, setNotes] = useState("");
  const [cardioType, setCardioType] = useState("Caminata inclinada");
  const [cardioMinutes, setCardioMinutes] = useState(day.cardioDefault);
  const [cardioIntensity, setCardioIntensity] = useState("MEDIUM");
  const [saved, setSaved] = useState(false);
  const [sets] = useState(day.exercises.flatMap((exercise: string) => Array.from({ length: 4 }).map((_, idx) => ({ exerciseId: exercise, setNumber: idx + 1, weightKg: null, reps: null, rir: null, completed: true }))));

  return <div className="space-y-4">
    <h1 className="text-xl font-bold">{day.title}</h1>
    {day.exercises.map((exercise: string) => <div key={exercise} className="card"><h2>{exercise}</h2><p className="text-zinc-400 text-sm">4x6-12 · descanso 90s</p></div>)}
    <div className="card space-y-2">
      <select className="input" value={cardioType} onChange={(e) => setCardioType(e.target.value)}><option>Caminata inclinada</option><option>Bici</option><option>HIIT ligero</option></select>
      <input className="input" type="number" value={cardioMinutes} onChange={(e) => setCardioMinutes(Number(e.target.value))} />
      <select className="input" value={cardioIntensity} onChange={(e) => setCardioIntensity(e.target.value)}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select>
      <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" />
      <button className="btn w-full" onClick={async () => { await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workoutDayId: day.id, notes, cardioType, cardioMinutes, cardioIntensity, sets }) }); setSaved(true); }}>Guardar sesión</button>
      {saved && <p className="text-emerald-400">Guardado ✅</p>}
    </div>
  </div>;
}
