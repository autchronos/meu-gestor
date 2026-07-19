"use client";
import { useState, useTransition } from "react";
import { criarNegocioCompleto } from "@/app/onboarding/acoes";

const NICHOS = ["Vendas de produtos", "Alimentação", "Aluguéis", "Serviços", "Outro"];

export function Wizard() {
  const [etapa, setEtapa] = useState(0);
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nicho, setNicho] = useState(NICHOS[0]);
  const [whatsapp, setWhatsapp] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function avancar() {
    if (etapa === 0 && !nomeNegocio.trim()) {
      setErro("Informe o nome do negócio.");
      return;
    }
    setErro(null);
    setEtapa((e) => e + 1);
  }

  function concluir() {
    setErro(null);
    iniciar(async () => {
      const r = await criarNegocioCompleto({
        nomeNegocio: nomeNegocio.trim(),
        nicho,
        whatsapp,
        saldoInicial: Number(saldoInicial.replace(",", ".")) || 0,
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  const campo =
    "w-full rounded-md border border-borda bg-superficie px-3 py-2 text-texto";
  const botao =
    "rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-texto-suave">Etapa {etapa + 1} de 4</p>

      {etapa === 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Nome do negócio
          <input className={campo} value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} />
        </label>
      )}

      {etapa === 1 && (
        <label className="flex flex-col gap-1 text-sm">
          Nicho do negócio
          <select className={campo} value={nicho} onChange={(e) => setNicho(e.target.value)}>
            {NICHOS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      {etapa === 2 && (
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp para lançamentos (com DDD)
          <input className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
        </label>
      )}

      {etapa === 3 && (
        <label className="flex flex-col gap-1 text-sm">
          Saldo inicial em caixa (opcional)
          <input className={campo} value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>
      )}

      {erro && <p className="text-sm text-saida">{erro}</p>}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setEtapa((e) => Math.max(0, e - 1))}
          disabled={etapa === 0 || pendente}
          className="rounded-md border border-borda px-4 py-2 text-texto-suave disabled:opacity-40"
        >
          Voltar
        </button>
        {etapa < 3 ? (
          <button type="button" onClick={avancar} className={botao}>Continuar</button>
        ) : (
          <button type="button" onClick={concluir} disabled={pendente} className={botao}>
            {pendente ? "Criando..." : "Concluir"}
          </button>
        )}
      </div>
    </div>
  );
}
