"use client";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "../../../components/Nav";

export default function ProgressPage() {
  const [data, setData] = useState<any>({ weight: [], volume: 0 });
  useEffect(() => { fetch('/api/progress').then((r) => r.json()).then(setData); }, []);
  const polyline = useMemo(() => {
    const w = data.weight || [];
    if (!w.length) return "";
    const min = Math.min(...w.map((x: any) => x.weightKg));
    const max = Math.max(...w.map((x: any) => x.weightKg));
    return w.map((x: any, i: number) => `${(i/(w.length-1||1))*280},${80-((x.weightKg-min)/((max-min)||1))*60}`).join(' ');
  }, [data]);

  return <div className="space-y-4"><h1 className="text-xl font-bold">Progreso</h1><div className="card"><svg viewBox="0 0 280 90" className="w-full"><polyline fill="none" stroke="#10b981" strokeWidth="3" points={polyline} /></svg></div><div className="card">Volumen semanal (sesiones): {data.volume}</div><Nav /></div>;
}
