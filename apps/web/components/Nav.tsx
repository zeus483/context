"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/today", label: "Hoy" },
  { href: "/calendar", label: "Calendario" },
  { href: "/progress", label: "Progreso" },
  { href: "/library", label: "Biblioteca" },
  { href: "/settings", label: "Ajustes" }
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl px-4 pb-4">
      <nav className="grid grid-cols-5 items-center gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-2 backdrop-blur">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-2 py-2 text-center text-[11px] transition ${
                active ? "bg-emerald-500 text-zinc-950" : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/login");
            router.refresh();
          }}
          className="col-span-5 mt-1 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Cerrar sesión
        </button>
      </nav>
    </div>
  );
}
