"use client";
import { useTema } from "@/hooks/useTema";

export function ToggleTema() {
  const { tema, alternar } = useTema();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "claro" ? "Ativar tema escuro" : "Ativar tema claro"}
      className="rounded-md border border-borda p-2 text-texto-suave transition-colors hover:text-texto"
    >
      {tema === "claro" ? "🌙" : "☀️"}
    </button>
  );
}
