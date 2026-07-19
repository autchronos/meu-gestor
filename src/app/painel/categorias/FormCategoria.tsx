"use client";
import { useState, useTransition } from "react";
import { criarCategoria } from "@/app/painel/categorias/acoes";

export function FormCategoria() {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function adicionar() {
    setErro(null);
    iniciar(async () => {
      const r = await criarCategoria(nome, tipo);
      if (r?.erro) { setErro(r.erro); return; }
      setNome("");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-borda p-3">
      <div className="flex gap-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova categoria"
          className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}
          className="rounded-md border border-borda bg-superficie px-2 text-sm text-texto">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </div>
      <button type="button" onClick={adicionar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Adicionando..." : "Adicionar categoria"}
      </button>
      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
    </div>
  );
}
