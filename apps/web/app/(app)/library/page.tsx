import { Nav } from "../../../components/Nav";
import { readData } from "../../../lib/store";

export default async function LibraryPage() {
  const data = await readData();
  return <div className="space-y-3"><h1 className="text-xl font-bold">Biblioteca</h1>{data.library.map((e: any) => <div key={e.id} className="card"><img src={e.imageUrl} alt={e.name} className="rounded-xl mb-2" /><h2>{e.name}</h2><p className="text-sm text-zinc-400">{e.instructions}</p><p className="text-xs text-zinc-500">Tips: {e.tips}. Alternativa: {e.alternatives}.</p></div>)}<Nav /></div>;
}
