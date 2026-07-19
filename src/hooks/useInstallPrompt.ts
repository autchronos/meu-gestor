"use client";
import { useCallback, useEffect, useState } from "react";
import { estaEmModoStandalone } from "@/lib/instalacao";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    setInstalado(estaEmModoStandalone());

    function aoDisparar(e: Event) {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    }
    function aoInstalar() {
      setInstalado(true);
      setEvento(null);
    }

    window.addEventListener("beforeinstallprompt", aoDisparar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoDisparar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }, [evento]);

  return { podeInstalar: evento !== null && !instalado, instalar, instalado };
}
