import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>;
}
