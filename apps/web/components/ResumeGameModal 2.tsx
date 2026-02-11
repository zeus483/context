"use client";

type ResumeGameModalProps = {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
};

export default function ResumeGameModal({ open, onResume, onRestart }: ResumeGameModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface2/95 p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Partida detectada</p>
        <h3 className="mt-2 font-display text-2xl">¿Reanudar partida en curso?</h3>
        <p className="mt-2 text-sm text-muted">
          Detectamos una sesión activa guardada en este dispositivo.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn-secondary" onClick={onRestart}>
            Reiniciar
          </button>
          <button type="button" className="btn-primary" onClick={onResume}>
            Reanudar
          </button>
        </div>
      </div>
    </div>
  );
}
