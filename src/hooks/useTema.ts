"use client";
import { useCallback, useEffect, useState } from "react";

export type Tema = "claro" | "escuro";

export function lerTemaInicial(): Tema {
  if (typeof window === "undefined") return "claro";
  return window.localStorage.getItem("tema") === "escuro" ? "escuro" : "claro";
}

export function useTema() {
  // Inicia em "claro" no servidor e na primeira pintura do cliente, para casar
  // com o HTML vindo do servidor e evitar hydration mismatch no toggle. O valor
  // real vem do localStorage logo após montar; o script anti-flash no layout já
  // aplicou a classe .dark antes disso, então não há piscada visual.
  const [tema, setTema] = useState<Tema>("claro");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setTema(lerTemaInicial());
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!montado) return;
    document.documentElement.classList.toggle("dark", tema === "escuro");
    window.localStorage.setItem("tema", tema);
  }, [tema, montado]);

  const alternar = useCallback(() => {
    setTema((t) => (t === "claro" ? "escuro" : "claro"));
  }, []);

  return { tema, alternar };
}
