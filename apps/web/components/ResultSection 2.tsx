import type { RefObject } from "react";
import type { Category, GameWinner, Player } from "../src/types";

type ResultSectionProps = {
  headingRef?: RefObject<HTMLHeadingElement>;
  winner: GameWinner | null;
  category: Category | null;
  word: string | null;
  players: Player[];
  onRematch: () => void;
  onChangeWord: () => void;
  onNewConfig: () => void;
};

export default function ResultSection({
  headingRef,
  winner,
  category,
  word,
  players,
  onRematch,
  onChangeWord,
  onNewConfig
}: ResultSectionProps) {
  const impostors = players.filter((player) => player.role === "IMPOSTOR");

  return (
    <section className="card p-6 md:p-8">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Paso 4</p>
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl focus:outline-none">
          Resultado final
        </h2>
        <p className="text-sm text-muted">Palabra, categoría y jugadores impostores de la ronda.</p>
      </header>

      <div className="mt-6 grid gap-5">
        <div className="rounded-3xl border border-white/10 bg-surface2/70 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Ganador</p>
          <p className="mt-2 text-3xl font-semibold">
            {winner === "GROUP" ? "GANÓ EL GRUPO" : "GANARON LOS IMPOSTORES"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-surface/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Palabra</p>
          <p className="mt-2 text-2xl font-semibold">{word}</p>
          <p className="mt-1 text-sm text-muted">Categoría: {category?.name}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-surface/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Impostores</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {impostors.map((player) => (
              <span key={player.id} className="chip">
                {player.name}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <button type="button" className="btn-primary w-full justify-center py-4 text-base" onClick={onRematch}>
            Revancha
          </button>
          <button type="button" className="btn-secondary" onClick={onChangeWord}>
            Cambiar palabra
          </button>
          <button type="button" className="btn-ghost" onClick={onNewConfig}>
            Volver a Config
          </button>
        </div>
      </div>
    </section>
  );
}
