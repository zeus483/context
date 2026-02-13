import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body><main className="mx-auto max-w-md p-4 pb-24">{children}</main></body>
    </html>
  );
}
