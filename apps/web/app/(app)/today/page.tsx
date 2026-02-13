import { Nav } from "../../../components/Nav";
import { getUserId } from "../../../lib/auth";
import { readData } from "../../../lib/store";

export default async function TodayPage() {
  const userId = getUserId();
  const data = await readData();
  const profile = data.profiles.find((p: any) => p.userId === userId);
  const dayIndex = new Date().getDay() % (profile?.trainingDays ?? 5);
  const todayDay = data.plan.days[dayIndex];
  const daysLeft = Math.ceil((new Date(profile.beachGoalDate).getTime() - Date.now()) / 86400000);
  const progress = Math.max(0, Math.min(100, Math.round(((56 - daysLeft) / 56) * 100)));

  return <div className="space-y-4"><div className="card"><p>Playa en {daysLeft} días</p><div className="h-2 bg-zinc-800 rounded-full mt-2"><div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} /></div></div><div className="card"><h1 className="text-xl font-bold">Hoy toca: {todayDay.title}</h1><p className="text-zinc-400">Cardio {todayDay.cardioDefault} min</p><a href={`/session/${todayDay.id}`} className="btn inline-block mt-2">Iniciar entrenamiento</a></div><Nav /></div>;
}
