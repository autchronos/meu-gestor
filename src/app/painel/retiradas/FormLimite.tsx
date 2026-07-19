"use client";
import { useState, useTransition } from "react";
import { definirLimite } from "@/app/painel/retiradas/acoes";
import { parseValorBRL } from "@/lib/formato";

export function FormLimite({ limiteAtual }: { limiteAtual: number }) {
  const [valor, setValor] = useState(limiteAtual > 0 ? String(limiteAtual).replace(".", ",") : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await definirLimite(parseValorBRL(valor));
      setMsg(r?.erro ?? "Limite salvo!");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold text-texto">Limite de pró-labore (por mês)</p>
      <div className="flex gap-2">
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00"
          className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto" />
        <button type="button" onClick={salvar} disabled={pendente}
          className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pendente ? "..." : "Salvar"}
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
