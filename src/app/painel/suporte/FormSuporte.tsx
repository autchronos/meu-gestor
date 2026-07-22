"use client";
import { useState, useTransition } from "react";
import { enviarSuporte } from "@/app/painel/suporte/acoes";

export function FormSuporte() {
  const [tipo, setTipo] = useState<"pergunta" | "sugestao">("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [contato, setContato] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function enviar() {
    setMsg(null);
    iniciar(async () => {
      const r = await enviarSuporte({ tipo, mensagem, contato });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Recebemos sua mensagem. Obrigado!");
      setMensagem(""); setContato(""); setTipo("sugestao");
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Nova mensagem</p>
      <select value={tipo} onChange={(e) => setTipo(e.target.value as "pergunta" | "sugestao")} className={campo}>
        <option value="sugestao">Sugestão de melhoria</option>
        <option value="pergunta">Pergunta / ajuda</option>
      </select>
      <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} placeholder="Escreva aqui…" className={campo} />
      <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="E-mail/WhatsApp para retorno (opcional)" className={campo} />
      <button type="button" onClick={enviar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "Enviando…" : "Enviar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
