"use client";

import { Nav } from "../../components/Nav";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <section className="card space-y-3 text-center">
        <h2 className="h1">Algo salió mal</h2>
        <p className="text-sm text-zinc-400">{error.message || "Error inesperado al cargar la página"}</p>
        <button className="btn w-full" type="button" onClick={reset}>
          Reintentar
        </button>
      </section>
      <Nav />
    </div>
  );
}