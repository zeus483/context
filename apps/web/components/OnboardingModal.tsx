"use client";

import { useEffect, useMemo, useState } from "react";

type OnboardingModalProps = {
  open: boolean;
  onClose: () => void;
};

const SLIDES = [
  {
    title: "Configura en 5s",
    body: "Elige jugadores, impostores y categorías con un preset rápido."
  },
  {
    title: "Rota el celular",
    body: "Cada persona revela su rol con gesto privado y pasa al siguiente."
  },
  {
    title: "Pistas y votación",
    body: "Hablen, detecten contradicciones y voten para atrapar impostores."
  }
];

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  const current = useMemo(() => SLIDES[index], [index]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface2/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Guía rápida {index + 1}/{SLIDES.length}
          </p>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Skip
          </button>
        </div>

        <div className="mt-5 grid gap-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-2xl">
            {index + 1}
          </div>
          <h3 className="font-display text-2xl">{current.title}</h3>
          <p className="text-sm text-muted">{current.body}</p>
        </div>

        <div className="mt-6 h-2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (index === SLIDES.length - 1) {
                onClose();
                return;
              }
              setIndex((value) => value + 1);
            }}
          >
            {index === SLIDES.length - 1 ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
