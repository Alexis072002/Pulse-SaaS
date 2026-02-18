import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        border: "var(--border)",
        border2: "var(--border-2)",
        text: "var(--text)",
        text2: "var(--text-2)",
        textMuted: "var(--text-muted)",
        accent: "#7C3AED",
        accent2: "#A855F7",
        youtube: "#FF4444",
        ga: "#34D399"
      },
      fontFamily: {
        syne: ["var(--font-syne)"],
        sans: ["var(--font-dm-sans)"],
        mono: ["var(--font-dm-mono)"]
      }
    }
  },
  plugins: []
};

export default config;
