import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#0a0b0f",
        surface: "#131520",
        surface2: "#1b1f2d",
        ink: "#f8fafc",
        muted: "#9aa3b2",
        accent: "#29f0b1",
        accent2: "#fbbf24",
        danger: "#f87171"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      }
    }
  },
  plugins: []
};

export default config;
