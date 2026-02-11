import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Sora } from "next/font/google";

const sora = Sora({ subsets: ["latin"], variable: "--font-body" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Impostor Clásico",
  description: "Juego clásico de impostores en un solo celular. Rápido, simple y offline.",
  applicationName: "Impostor Clásico",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "Impostor Clásico",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b0f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sora.variable} ${space.variable}`}>
      <body className="min-h-screen bg-base text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
