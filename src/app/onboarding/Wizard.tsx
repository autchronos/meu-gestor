"use client";
import { useState, useTransition } from "react";
import { criarNegocioCompleto } from "@/app/onboarding/acoes";
import { parseValorBRL } from "@/lib/formato";
import { capacidadesPadrao, CAPACIDADES, type Flags } from "@/lib/negocio/capacidades";
import { nichoParaRamo } from "@/lib/auth/roteamento";

const NICHOS = ["Vendas de produtos", "Alimentação", "Aluguéis", "Serviços", "Outro"];

export function Wizard() {
  const [etapa, setEtapa] = useState(0);
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nicho, setNicho] = useState(NICHOS[0]);
  const [flags, setFlags] = useState<Flags>(() => capacidadesPadrao(nichoParaRamo(NICHOS[0])));
  const [whatsapp, setWhatsapp] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function escolherNicho(n: string) {
    setNicho(n);
    setFlags(capacidadesPadrao(nichoParaRamo(n))); // re-sugere pelas capacidades do ramo
  }

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
        flags,
        whatsapp,
        saldoInicial: parseValorBRL(saldoInicial),
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-texto";
  const botao = "bg-marca px-4 py-2 font-semibold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60";
  const ULTIMA = 4;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-texto-suave">Etapa {etapa + 1} de 5</p>

      {etapa === 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Nome do negócio
          <input className={campo} value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} />
        </label>
      )}

      {etapa === 1 && (
        <label className="flex flex-col gap-1 text-sm">
          Nicho do negócio
          <select className={campo} value={nicho} onChange={(e) => escolherNicho(e.target.value)}>
            {NICHOS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}

      {etapa === 2 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm text-texto-suave">O que seu negócio usa? (pode ajustar depois)</legend>
          {CAPACIDADES.map((c) => (
            <label key={c.chave} className="flex items-start gap-3 border border-borda bg-superficie p-3 text-sm">
              <input
                type="checkbox"
                checked={flags[c.chave]}
                onChange={(e) => setFlags((f) => ({ ...f, [c.chave]: e.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-texto">{c.rotulo}</span>
                <span className="block text-texto-suave">{c.descricao}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {etapa === 3 && (
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp para lançamentos (com DDD)
          <input className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
        </label>
      )}

      {etapa === 4 && (
        <label className="flex flex-col gap-1 text-sm">
          Saldo inicial em caixa (opcional)
          <input className={campo} value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>
      )}

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}

      <div className="flex justify-between">
        <button type="button" onClick={() => setEtapa((e) => Math.max(0, e - 1))} disabled={etapa === 0 || pendente}
          className="border border-borda px-4 py-2 text-texto-suave disabled:opacity-40">
          Voltar
        </button>
        {etapa < ULTIMA ? (
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
