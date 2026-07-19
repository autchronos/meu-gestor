"use client";
import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { ehIOS } from "@/lib/instalacao";

export function BotaoInstalar() {
  const { podeInstalar, instalar, instalado } = useInstallPrompt();
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);

  if (instalado) return null;

  async function aoClicar() {
    if (podeInstalar) {
      await instalar();
      return;
    }
    setMostrarInstrucoes(true);
  }

  const ios =
    typeof navigator !== "undefined" && ehIOS(navigator.userAgent);

  return (
    <div>
      <button
        type="button"
        onClick={aoClicar}
        className="rounded-md border-2 border-dourado px-5 py-3 font-semibold text-marca transition-colors hover:bg-dourado/10 dark:text-texto"
      >
        📲 Baixar no celular
      </button>
      {mostrarInstrucoes && (
        <p className="mt-3 max-w-xs text-sm text-texto-suave">
          {ios
            ? "Toque no botão Compartilhar do Safari e escolha “Adicionar à Tela de Início”."
            : "No menu do navegador, escolha “Instalar app” ou “Adicionar à tela inicial”."}
        </p>
      )}
    </div>
  );
}
