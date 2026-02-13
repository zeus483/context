"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="h1">Algo salió mal</h2>
      <p className="text-sm text-zinc-400">{error.message || "Error inesperado"}</p>
      <button className="btn" type="button" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}