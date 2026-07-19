"use client";
import { useState, useTransition } from "react";
import { salvarCapacidades } from "@/app/painel/configuracoes/acoes";
import { CAPACIDADES, type Flags } from "@/lib/negocio/capacidades";

export function FormCapacidades({ inicial }: { inicial: Flags }) {
  const [flags, setFlags] = useState<Flags>(inicial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarCapacidades(flags);
      setMsg(r?.erro ?? "Salvo!");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {CAPACIDADES.map((c) => (
        <label key={c.chave} className="flex items-start gap-3 rounded-md border border-borda p-3 text-sm">
          <input type="checkbox" checked={flags[c.chave]} onChange={(e) => setFlags((f) => ({ ...f, [c.chave]: e.target.checked }))} className="mt-1" />
          <span>
            <span className="font-medium text-texto">{c.rotulo}</span>
            <span className="block text-texto-suave">{c.descricao}</span>
          </span>
        </label>
      ))}
      <button type="button" onClick={salvar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Salvando..." : "Salvar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
