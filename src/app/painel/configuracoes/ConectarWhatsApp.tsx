"use client";
import { useState, useTransition } from "react";
import { conectarWhatsApp } from "@/app/painel/configuracoes/acoes";

export function ConectarWhatsApp({ numeroSugerido, conectados }: { numeroSugerido: string | null; conectados: string[] }) {
  const [link, setLink] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const r = await conectarWhatsApp();
      if ("erro" in r) { setErro(r.erro); return; }
      setLink(r.link);
      setCodigo(r.codigo);
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Conectar WhatsApp</p>
      {conectados.length > 0 ? (
        <p className="text-sm text-entrada">✅ Conectado: {conectados.join(", ")}</p>
      ) : (
        <p className="text-sm text-texto-suave">
          Registre lançamentos pelo WhatsApp. {numeroSugerido ? `Número cadastrado: ${numeroSugerido} — conecte por ele ou por outro.` : ""}
        </p>
      )}
      <button
        type="button"
        onClick={gerar}
        disabled={pendente}
        className="self-start bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pendente ? "..." : conectados.length > 0 ? "Conectar outro número" : "Conectar WhatsApp"}
      </button>
      {codigo && link && (
        <div className="flex flex-col gap-1 border border-borda p-3 text-sm">
          <p className="text-texto-suave">Toque no link abaixo e envie a mensagem já preenchida:</p>
          <a href={link} target="_blank" rel="noreferrer" className="font-semibold text-marca underline">
            Abrir WhatsApp com o código {codigo}
          </a>
          <p className="text-texto-suave">O código expira em 10 minutos.</p>
        </div>
      )}
      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
    </div>
  );
}
