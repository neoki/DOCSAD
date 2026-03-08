import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Lato'", "'Segoe UI'", "sans-serif"],
      },
      colors: {
        sidebar: "#0f172a",
        primary: {
          DEFAULT: "#4F7CFF",
          50: "#eff4ff",
          100: "#dbe6ff",
          500: "#4F7CFF",
          600: "#3b63d9",
          700: "#2d4fb3",
        },
        success: {
          DEFAULT: "#22C55E",
          light: "#dcfce7",
          dark: "#166534",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#fef3c7",
          dark: "#92400e",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#fef2f2",
          dark: "#991b1b",
        },
        rosa: "#EC4899",
        violeta: "#8B5CF6",
        cyan: "#06b6d4",
        gasoleo: "#78716c",
        reformas: "#a855f7",
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,.06)",
        "card-hover": "0 4px 16px rgba(0,0,0,.10)",
      },
    },
  },
  plugins: [],
};

export default config;
