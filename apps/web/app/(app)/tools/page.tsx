"use client";

import Link from "next/link";
import { useState } from "react";
import { Nav } from "../../../components/Nav";

const PERCENTAGES = [50, 60, 70, 75, 80, 85, 90, 95] as const;
const PLATES = [20, 15, 10, 5, 2.5, 1.25] as const;

function calcOneRM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const brzycki = weight * (36 / (37 - reps));
  const epley = weight * (1 + reps / 30);
  return Math.round((((brzycki + epley) / 2) * 10)) / 10;
}

function calcPlates(target: number, barWeight: number): { kg: number; count: number }[] {
  let remaining = Math.max(0, (target - barWeight) / 2);
  const result: { kg: number; count: number }[] = [];
  for (const plate of PLATES) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ kg: plate, count });
      remaining -= plate * count;
    }
  }
  return result;
}

function plateStyle(kg: number) {
  if (kg === 20) return "bg-red-900 text-red-200";
  if (kg === 15) return "bg-yellow-900 text-yellow-200";
  if (kg === 10) return "bg-blue-900 text-blue-200";
  if (kg === 5) return "bg-zinc-700 text-zinc-200";
  if (kg === 2.5) return "bg-green-900 text-green-200";
  return "bg-zinc-600 text-zinc-300";
}

export default function ToolsPage() {
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(8);
  const [targetWeight, setTargetWeight] = useState(100);
  const [barWeight, setBarWeight] = useState(20);

  const oneRM = calcOneRM(weight, Math.max(1, Math.min(30, reps)));

  const percentageRows = PERCENTAGES.map((pct) => {
    const kg = Math.round(((oneRM * pct) / 100) * 10) / 10;
    const repsApprox = oneRM > 0 ? Math.max(1, Math.round(37 - 36 * (kg / oneRM))) : 0;
    return {
      pct,
      kg,
      repsApprox
    };
  });

  const closestPct = percentageRows.reduce<{ pct: number; diff: number } | null>((acc, row) => {
    const diff = Math.abs(row.kg - weight);
    if (!acc || diff < acc.diff) {
      return { pct: row.pct, diff };
    }
    return acc;
  }, null)?.pct;

  const plateResult = calcPlates(targetWeight, barWeight);
  const perSideLoad = plateResult.reduce((sum, row) => sum + row.kg * row.count, 0);
  const totalCalculated = Math.round((barWeight + perSideLoad * 2) * 10) / 10;
  const targetDiff = Math.round((targetWeight - totalCalculated) * 10) / 10;

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Herramientas</p>
            <h1 className="h1">Calculadoras</h1>
          </div>
          <Link href="/settings" className="btn-secondary h-11 px-4">
            Volver
          </Link>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Calculadora 1RM</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Peso levantado (kg)</label>
            <input className="input h-11" type="number" min={0} step="0.5" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Repeticiones (1-30)</label>
            <input className="input h-11" type="number" min={1} max={30} value={reps} onChange={(e) => setReps(Number(e.target.value))} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-500">1RM estimado</p>
          <p className="metric">{oneRM > 0 ? `${oneRM.toFixed(1)} kg` : "0.0 kg"}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 p-2">
          {percentageRows.map((row, idx) => (
            <div
              key={row.pct}
              className={`grid grid-cols-3 items-center gap-2 px-2 py-2 text-sm ${
                row.pct === closestPct ? "bg-zinc-800" : ""
              } ${idx < percentageRows.length - 1 ? "border-b border-zinc-800" : ""}`}
            >
              <span className="text-zinc-300">{row.pct}%</span>
              <span className="text-zinc-200">{row.kg.toFixed(1)} kg</span>
              <span className="text-zinc-500">~{row.repsApprox} reps</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Calculadora de placas</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Peso objetivo (kg)</label>
            <input
              className="input h-11"
              type="number"
              min={0}
              step="0.5"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Peso barra (kg)</label>
            <input className="input h-11" type="number" min={0} step="0.5" value={barWeight} onChange={(e) => setBarWeight(Number(e.target.value))} />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-500">Placas por lado</p>
          {plateResult.length ? (
            <div className="flex flex-wrap gap-2">
              {plateResult.map((row) => (
                <span key={row.kg} className={`rounded-full px-3 py-1 text-xs font-semibold ${plateStyle(row.kg)}`}>
                  {row.kg}kg × {row.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No necesitas placas adicionales.</p>
          )}
          <p className="text-sm text-zinc-300">Total: {totalCalculated.toFixed(1)} kg</p>
          {Math.abs(targetDiff) > 0.01 ? (
            <p className="text-xs text-amber-300">
              Diferencia con objetivo: {targetDiff > 0 ? "+" : ""}
              {targetDiff.toFixed(1)} kg
            </p>
          ) : null}
        </div>
      </section>

      <Nav />
    </div>
  );
}
