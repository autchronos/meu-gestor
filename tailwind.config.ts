import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fundo: "var(--cor-fundo)",
        superficie: "var(--cor-superficie)",
        borda: "var(--cor-borda)",
        texto: "var(--cor-texto)",
        "texto-suave": "var(--cor-texto-suave)",
        marca: "var(--cor-marca)",
        dourado: "var(--cor-dourado)",
        entrada: "var(--cor-entrada)",
        saida: "var(--cor-saida)",
        "navy-profundo": "var(--cor-navy-profundo)",
        "dourado-suave": "var(--cor-dourado-suave)",
      },
      fontFamily: {
        serif: ["var(--fonte-serif)", "serif"],
        sans: ["var(--fonte-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
