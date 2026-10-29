import type { Config } from "tailwindcss";

/** Charte "Éco-Sport" */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Vert forêt / émeraude : couleurs principales
        foret: {
          50: "#eef7f1",
          100: "#d5ecdd",
          200: "#acd8bd",
          300: "#79bd96",
          400: "#4a9f72",
          500: "#2f8459",
          600: "#226a47",
          700: "#1d553b",
          800: "#1a4431",
          900: "#14352a",
          950: "#0b1f18",
        },
        emeraude: {
          400: "#34c48a",
          500: "#10a571",
          600: "#0b8a5d",
        },
        // Vert sauge et beige doux : fonds et cartes
        sauge: {
          50: "#f4f6f1",
          100: "#e6ebe0",
          200: "#cfd8c4",
          300: "#b2c0a2",
          400: "#94a67f",
        },
        sable: {
          50: "#fbf8f2",
          100: "#f5efe3",
          200: "#ebe0c9",
          300: "#dccaa6",
        },
        // Terracotta : rappel du ballon
        terracotta: {
          300: "#f0a57c",
          400: "#e8834f",
          500: "#d9672f",
          600: "#b95223",
          700: "#93411f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        carte: "0 1px 2px rgba(20,53,42,0.06), 0 4px 16px -6px rgba(20,53,42,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
