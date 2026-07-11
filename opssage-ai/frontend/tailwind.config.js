/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        opssage: {
          50: "#f0f4ff",
          500: "#4f6bed",
          900: "#1a237e",
        },
      },
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

