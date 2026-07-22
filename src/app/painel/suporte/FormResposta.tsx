"use client";
import { useState, useTransition } from "react";
import { responderSuporte } from "@/app/painel/suporte/acoes";

export function FormResposta({ id, respostaAtual, statusAtual }: { id: string; respostaAtual: string; statusAtual: string }) {
  const [resposta, setResposta] = useState(respostaAtual);
  const [status, setStatus] = useState(statusAtual);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function enviar() {
    setMsg(null);
    iniciar(async () => {
      const r = await responderSuporte({ id, resposta, status });
      setMsg(r?.erro ?? "Resposta salva!");
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-borda pt-3">
      <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={3} placeholder="Escreva a resposta…" className={campo} />
      <div className="flex items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={campo}>
          <option value="aberto">Aberto</option>
          <option value="respondido">Respondido</option>
          <option value="resolvido">Resolvido</option>
        </select>
        <button type="button" onClick={enviar} disabled={pendente}
          className="whitespace-nowrap bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {pendente ? "…" : "Responder"}
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
