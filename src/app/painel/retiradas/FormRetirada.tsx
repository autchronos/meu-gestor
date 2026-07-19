"use client";
import { useState, useTransition } from "react";
import { registrarRetirada } from "@/app/painel/retiradas/acoes";
import { parseValorBRL } from "@/lib/formato";

export function FormRetirada() {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function registrar() {
    setErro(null);
    iniciar(async () => {
      const r = await registrarRetirada(parseValorBRL(valor), descricao);
      if (r?.erro) { setErro(r.erro); return; }
      setValor(""); setDescricao("");
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Registrar retirada</p>
      <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor (0,00)" className={campo} />
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className={campo} />
      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      <button type="button" onClick={registrar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Registrando..." : "Registrar retirada"}
      </button>
    </div>
  );
}
