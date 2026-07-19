"use client";
import { useState, useTransition } from "react";
import { salvarLancamento } from "@/app/painel/lancamentos/acoes";
import { parseValorBRL } from "@/lib/formato";
import type { TipoUI, Carteira } from "@/lib/caixa/lancamento";

interface Categoria { id: string; nome: string; tipo: "entrada" | "saida" }

export function FormLancamento({
  categorias, usaCarteiras, hoje,
}: { categorias: Categoria[]; usaCarteiras: boolean; hoje: string }) {
  const [tipoUI, setTipoUI] = useState<TipoUI>("entrada");
  const [carteira, setCarteira] = useState<Carteira>("empresa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const tipoCategoria = tipoUI === "entrada" ? "entrada" : "saida";
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoCategoria);
  const campo = "w-full rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function enviar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarLancamento({
        tipoUI, carteira, valor: parseValorBRL(valor), descricao, data,
        categoria_id: categoriaId || null,
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["entrada", "saida", ...(usaCarteiras ? ["retirada"] as const : [])] as TipoUI[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTipoUI(t); setCategoriaId(""); }}
            className={`flex-1 rounded-md border px-2 py-2 text-sm capitalize ${tipoUI === t ? "border-marca bg-marca text-white" : "border-borda text-texto-suave"}`}>
            {t}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">Valor
        <input className={campo} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
      </label>
      <label className="flex flex-col gap-1 text-sm">Descrição
        <input className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Data
        <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} />
      </label>

      {tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Categoria
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categoriasFiltradas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      )}

      {usaCarteiras && tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Carteira
          <select className={campo} value={carteira} onChange={(e) => setCarteira(e.target.value as Carteira)}>
            <option value="empresa">Empresa</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </label>
      )}

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      <button type="button" onClick={enviar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Salvando..." : "Salvar lançamento"}
      </button>
    </div>
  );
}
