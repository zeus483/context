"use client";

import { useEffect, useState } from "react";
import type { Player } from "../src/types";

type VoteResult = {
  name: string;
  wasImpostor: boolean;
};

type VoteModalProps = {
  open: boolean;
  players: Player[];
  result: VoteResult | null;
  onClose: () => void;
  onConfirm: (playerId: string) => void;
};

export default function VoteModal({ open, players, result, onClose, onConfirm }: VoteModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setConfirming(false);
    }
  }, [open]);

  useEffect(() => {
    if (result) {
      setConfirming(false);
      setSelectedId(null);
    }
  }, [result]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectedPlayer = players.find((player) => player.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-0 sm:flex sm:items-end sm:justify-center sm:p-4">
      <div className="h-full w-full overflow-y-auto border border-white/10 bg-surface2/95 p-6 sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl">
        {result ? (
          <div className="grid gap-4 pt-8 text-center sm:pt-0">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Resultado</p>
            <p className="text-2xl font-semibold">
              {result.wasImpostor ? "✅ Sí, era impostor" : "❌ No era impostor"}
            </p>
            <p className="text-sm text-muted">Jugador: {result.name}</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              Continuar
            </button>
          </div>
        ) : confirming && selectedPlayer ? (
          <div className="grid gap-4 pt-8 text-center sm:pt-0">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Confirmación</p>
            <p className="text-xl font-semibold">¿Seguro que votas por {selectedPlayer.name}?</p>
            <p className="text-xs text-muted">Voto irreversible.</p>
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <button type="button" className="btn-primary" onClick={() => onConfirm(selectedPlayer.id)}>
                Confirmar voto
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 pt-4 sm:pt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Votación</p>
                <p className="text-lg font-semibold">Elige un jugador</p>
              </div>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cerrar
              </button>
            </div>

            <div className="grid gap-2">
              {players.map((player) => (
                <button
                  type="button"
                  key={player.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selectedId === player.id
                      ? "border-accent/60 bg-accent/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                  onClick={() => {
                    setSelectedId(player.id);
                    setConfirming(true);
                  }}
                >
                  <span>{player.name}</span>
                  {player.accusedCount > 0 ? (
                    <span className="text-xs text-muted">Acusado x{player.accusedCount}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
