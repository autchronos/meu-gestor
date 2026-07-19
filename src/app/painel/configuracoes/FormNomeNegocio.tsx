"use client";
import { useState, useTransition } from "react";
import { renomearNegocio } from "@/app/painel/configuracoes/acoes";

export function FormNomeNegocio({ nomeAtual }: { nomeAtual: string }) {
  const [nome, setNome] = useState(nomeAtual);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await renomearNegocio(nome);
      setMsg(r?.erro ?? "Nome atualizado!");
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Nome do negócio</p>
      <div className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1 border border-borda bg-superficie px-3 py-2 text-sm text-texto"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={pendente}
          className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pendente ? "..." : "Salvar"}
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
