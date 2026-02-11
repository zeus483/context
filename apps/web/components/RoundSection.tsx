"use client";

import type { RefObject } from "react";
import type { Player } from "../src/types";
import { formatDuration } from "../src/utils/game";

type RoundSectionProps = {
  headingRef?: RefObject<HTMLHeadingElement>;
  remainingSeconds: number;
  players: Player[];
  roundNotice: string | null;
  onVote: () => void;
  onEndRound: () => void;
};

export default function RoundSection({
  headingRef,
  remainingSeconds,
  players,
  roundNotice,
  onVote,
  onEndRound
}: RoundSectionProps) {
  return (
    <section className="card min-h-[calc(100svh-11rem)] p-6 md:p-8">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Paso 3</p>
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl focus:outline-none">
          Ronda
        </h2>
        <p className="text-sm text-muted">Den pistas, sospechen y voten antes de que termine el tiempo.</p>
      </header>

      <div className="mt-6 rounded-3xl border border-white/10 bg-surface2/70 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Tiempo restante</p>
        <div className="mt-3 text-6xl font-semibold tabular-nums">{formatDuration(remainingSeconds)}</div>
      </div>

      {roundNotice ? (
        <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-ink">
          {roundNotice}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" className="btn-primary w-full justify-center py-4 text-base" onClick={onVote}>
          Votar
        </button>
        <button type="button" className="btn-danger w-full justify-center py-4 text-base" onClick={onEndRound}>
          Terminar ronda
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-surface/50 p-5">
        <p className="text-sm font-semibold">Jugadores</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-2 text-sm ${
                player.eliminated ? "border-white/10 bg-white/5 opacity-50 line-through" : "border-white/10 bg-white/5"
              }`}
            >
              <span>{player.name}</span>
              <span className="text-xs text-muted">
                {player.eliminated ? "Eliminado" : player.accusedCount > 0 ? `Acusado x${player.accusedCount}` : "Activo"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
