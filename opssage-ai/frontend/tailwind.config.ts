import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        brand: "var(--brand)",
        "brand-hover": "var(--brand-hover)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        opssage: {
          50: "#f0f4ff",
          500: "#4f6bed",
          900: "#1a237e",
        },
      },
      // Incident severity colors used throughout the UI.
      // These are independent from Tailwind's built-in palette.
      severity: {
        critical: "#ef4444",
        high: "#f97316",
        medium: "#eab308",
        low: "#3b82f6",
      },
    },
  },
  plugins: [],
};

export default config;
