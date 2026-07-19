"use client";
import { useCallback, useEffect, useState } from "react";

export type Tema = "claro" | "escuro";

export function lerTemaInicial(): Tema {
  if (typeof window === "undefined") return "claro";
  return window.localStorage.getItem("tema") === "escuro" ? "escuro" : "claro";
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
    window.localStorage.setItem("tema", tema);
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((t) => (t === "claro" ? "escuro" : "claro"));
  }, []);

  return { tema, alternar };
}
