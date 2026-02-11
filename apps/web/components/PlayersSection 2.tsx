"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

type PlayersSectionProps = {
  playerCount: number;
  playerNames: string[];
  onNameChange: (index: number, value: string) => void;
  onAutofill: () => void;
  disabled?: boolean;
};

export default function PlayersSection({
  playerCount,
  playerNames,
  onNameChange,
  onAutofill,
  disabled
}: PlayersSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const normalizedPlayers = useMemo(() => {
    return Array.from({ length: playerCount }, (_, index) => {
      const current = playerNames[index]?.trim();
      return current && current.length > 0 ? current : `Jugador ${index + 1}`;
    });
  }, [playerCount, playerNames]);

  const preview = normalizedPlayers.slice(0, 6);

  return (
    <div className="grid gap-4 rounded-3xl border border-white/10 bg-surface/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="font-display text-lg">Nombres de jugadores</h3>
          <p className="text-xs text-muted">Jugadores: {playerCount}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIsEditing((value) => !value)}
          disabled={disabled}
          aria-expanded={isEditing}
        >
          {isEditing ? "Listo" : "Editar nombres"}
        </button>
      </div>

      {!isEditing ? (
        <div className="flex flex-wrap gap-2">
          {preview.map((name) => (
            <span key={name} className="chip">
              {name}
            </span>
          ))}
          {normalizedPlayers.length > preview.length ? (
            <span className="chip">+{normalizedPlayers.length - preview.length}</span>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex justify-end">
            <button type="button" className="btn-ghost" onClick={onAutofill} disabled={disabled}>
              Autollenar
            </button>
          </div>
          <div className="max-h-72 space-y-3 overflow-auto pr-1">
            {Array.from({ length: playerCount }).map((_, index) => (
              <label key={index} className="grid gap-1 text-xs text-muted">
                Jugador {index + 1}
                <input
                  type="text"
                  value={playerNames[index] ?? ""}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => onNameChange(index, event.target.value)}
                  placeholder={`Jugador ${index + 1}`}
                  className="input"
                  disabled={disabled}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
