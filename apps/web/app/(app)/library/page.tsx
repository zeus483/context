import { Nav } from "../../../components/Nav";
import { requireAuthContext } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

type LibraryPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  await requireAuthContext();

  const query = searchParams?.q?.trim() ?? "";

  const exercises = await prisma.exercise.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { muscleGroup: { contains: query, mode: "insensitive" } },
            { equipment: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }]
  });

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="h1">Biblioteca de ejercicios</h1>
        <p className="mt-1 text-sm text-zinc-400">Técnica clara, tips rápidos y alternativas si falta máquina en el gym.</p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" action="/library" method="get">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre, grupo muscular o equipo..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
          <button type="submit" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500">
            Buscar
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          {exercises.length} resultado{exercises.length === 1 ? "" : "s"}
          {query ? ` para “${query}”` : " en total"}
        </p>
      </section>

      <section className="space-y-3">
        {exercises.length === 0 ? (
          <article className="card text-sm text-zinc-300">
            No encontramos ejercicios con ese filtro. Prueba con otro nombre o grupo muscular.
          </article>
        ) : null}
        {exercises.map((exercise) => (
          <article key={exercise.id} className="card space-y-3">
            <div className="grid grid-cols-[120px,1fr] gap-3">
              <img src={exercise.imageUrl} alt={exercise.name} className="h-24 w-full rounded-xl object-cover" />
              <div>
                <h2 className="h2">{exercise.name}</h2>
                <p className="text-xs text-zinc-500">
                  {exercise.muscleGroup} · {exercise.equipment}
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="card-muted">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Cómo se hace</p>
                <p className="mt-1 text-zinc-200">{exercise.instructions}</p>
              </div>
              <div className="card-muted">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Tips</p>
                <p className="mt-1 text-zinc-200">{exercise.tips}</p>
              </div>
              <div className="card-muted">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Errores comunes</p>
                <p className="mt-1 text-zinc-200">{exercise.commonMistakes}</p>
              </div>
              <div className="card-muted">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Alternativas</p>
                <p className="mt-1 text-zinc-200">{exercise.alternatives}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <Nav />
    </div>
  );
}
