import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Transformación 2026",
  description: "App mobile-first para hipertrofia, cardio y progreso de 8 semanas"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
