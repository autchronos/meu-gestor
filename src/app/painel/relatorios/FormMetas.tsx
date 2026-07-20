"use client";
import { useState, useTransition } from "react";
import { salvarMetas } from "@/app/painel/relatorios/acoes";
import { parseValorBRL } from "@/lib/formato";

export function FormMetas({ faturamentoAtual, lucroAtual }: { faturamentoAtual: number; lucroAtual: number }) {
  const [fat, setFat] = useState(faturamentoAtual > 0 ? String(faturamentoAtual).replace(".", ",") : "");
  const [luc, setLuc] = useState(lucroAtual > 0 ? String(lucroAtual).replace(".", ",") : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarMetas(parseValorBRL(fat), parseValorBRL(luc));
      setMsg(r?.erro ?? "Metas salvas!");
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Definir metas do mês</p>
      <label className="flex flex-col gap-1 text-sm">Meta de faturamento
        <input value={fat} onChange={(e) => setFat(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Meta de lucro
        <input value={luc} onChange={(e) => setLuc(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar metas"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
