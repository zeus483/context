import { Nav } from "../../../components/Nav";
import { getUserId } from "../../../lib/auth";
import { readData } from "../../../lib/store";

export default async function CalendarPage() {
  const userId = getUserId();
  const data = await readData();
  const sessions = data.sessions.filter((s: any) => s.userId === userId).slice(0, 30);
  return <div className="space-y-3"><h1 className="text-xl font-bold">Calendario</h1>{sessions.map((s: any) => <div className="card flex justify-between" key={s.id}><span>{new Date(s.date).toLocaleDateString()}</span><span>{s.status === "DONE" ? "✅" : "⚠️"}</span></div>)}<Nav /></div>;
}
