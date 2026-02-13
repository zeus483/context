export function Nav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-md grid grid-cols-4 gap-2 border-t border-zinc-800 bg-zinc-950/95 p-3 text-xs">
      <a href="/today">Hoy</a><a href="/calendar">Calendario</a><a href="/progress">Progreso</a><a href="/library">Biblioteca</a>
    </nav>
  );
}
