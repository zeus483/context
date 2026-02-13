import { Nav } from "../../../components/Nav";
import { requireAuthContext } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export default async function LibraryPage() {
  await requireAuthContext();

  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }]
  });

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="h1">Biblioteca de ejercicios</h1>
        <p className="mt-1 text-sm text-zinc-400">Técnica clara, tips rápidos y alternativas si falta máquina en el gym.</p>
      </section>

      <section className="space-y-3">
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
