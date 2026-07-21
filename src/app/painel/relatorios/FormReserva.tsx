"use client";
import { useState, useTransition } from "react";
import { salvarReserva, ajustarReserva } from "@/app/painel/relatorios/acoes";
import { parseValorBRL } from "@/lib/formato";

interface Props { alvoAtual: number; prazoAtual: string; saldoMinimoAtual: number }

export function FormReserva({ alvoAtual, prazoAtual, saldoMinimoAtual }: Props) {
  const brl = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");
  const [alvo, setAlvo] = useState(brl(alvoAtual));
  const [prazo, setPrazo] = useState(prazoAtual);
  const [minimo, setMinimo] = useState(brl(saldoMinimoAtual));
  const [mov, setMov] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function definir() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarReserva(parseValorBRL(alvo), prazo, parseValorBRL(minimo));
      setMsg(r?.erro ?? "Reserva salva!");
    });
  }
  function mexer(sinal: 1 | -1) {
    const v = parseValorBRL(mov);
    if (v <= 0) { setMsg("Informe um valor para guardar ou tirar."); return; }
    setMsg(null);
    iniciar(async () => {
      const r = await ajustarReserva(sinal * v);
      if (!r?.erro) setMov("");
      setMsg(r?.erro ?? (sinal === 1 ? "Guardado!" : "Retirado da reserva."));
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Definir reserva</p>
      <label className="flex flex-col gap-1 text-sm">Alvo da reserva
        <input value={alvo} onChange={(e) => setAlvo(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Prazo (opcional)
        <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Saldo mínimo do caixa (alerta)
        <input value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <button type="button" onClick={definir} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar reserva"}
      </button>
      <div className="mt-2 flex items-end gap-2 border-t border-borda pt-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">Guardar / tirar
          <input value={mov} onChange={(e) => setMov(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
        </label>
        <button type="button" onClick={() => mexer(1)} disabled={pendente}
          className="border border-entrada px-3 py-2 text-sm font-semibold uppercase tracking-wider text-entrada transition-colors hover:bg-entrada hover:text-white disabled:opacity-60">Guardar</button>
        <button type="button" onClick={() => mexer(-1)} disabled={pendente}
          className="border border-borda px-3 py-2 text-sm font-semibold uppercase tracking-wider text-texto-suave transition-colors hover:text-saida disabled:opacity-60">Tirar</button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
