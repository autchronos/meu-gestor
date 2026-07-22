"use client";
import { useEffect, useRef, useState, useTransition } from "react";

export function BotaoExcluir({ acao, id, label = "Excluir" }: {
  acao: (id: string) => Promise<unknown>; id: string; label?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function clique() {
    setErro(null);
    if (!confirmando) {
      setConfirmando(true);
      timer.current = setTimeout(() => setConfirmando(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setConfirmando(false);
    iniciar(async () => {
      const r = (await acao(id)) as { erro?: string } | undefined;
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={clique} disabled={pendente}
        className={`text-xs disabled:opacity-60 ${confirmando ? "font-semibold text-saida" : "text-texto-suave hover:text-saida"}`}>
        {pendente ? "..." : confirmando ? "Confirmar?" : label}
      </button>
      {erro && <span className="text-[11px] text-saida">{erro}</span>}
    </span>
  );
}
