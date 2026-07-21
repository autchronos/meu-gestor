"use client";
import { useState, useTransition } from "react";
import { salvarLancamento, registrarVenda } from "@/app/painel/lancamentos/acoes";
import { parseValorBRL, formatarBRL } from "@/lib/formato";
import { totalVenda } from "@/lib/estoque/calculos";
import type { TipoUI, Carteira } from "@/lib/caixa/lancamento";

interface Categoria { id: string; nome: string; tipo: "entrada" | "saida" }
interface ItemVenda { id: string; nome: string; preco: number; unidade: string; estoque: number; controla_estoque: boolean }
interface Linha { item_id: string; quantidade: string }

export function FormLancamento({
  categorias, usaCarteiras, hoje, usaEstoque = false, itensVenda = [],
}: { categorias: Categoria[]; usaCarteiras: boolean; hoje: string; usaEstoque?: boolean; itensVenda?: ItemVenda[] }) {
  const [tipoUI, setTipoUI] = useState<TipoUI>("entrada");
  const [carteira, setCarteira] = useState<Carteira>("empresa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState("");
  const [comItens, setComItens] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([{ item_id: "", quantidade: "1" }]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const tipoCategoria = tipoUI === "entrada" ? "entrada" : "saida";
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoCategoria);
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";
  const mapaItem = new Map(itensVenda.map((i) => [i.id, i]));
  const modoVenda = usaEstoque && tipoUI === "entrada" && comItens;

  const linhasResolvidas = linhas
    .map((l) => ({ ...l, item: mapaItem.get(l.item_id), qtd: parseInt(l.quantidade || "0", 10) }))
    .filter((l) => l.item && l.qtd > 0);
  const total = totalVenda(linhasResolvidas.map((l) => ({ quantidade: l.qtd, preco: l.item!.preco })));

  function setLinha(i: number, patch: Partial<Linha>) {
    setLinhas((xs) => xs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function enviar() {
    setErro(null);
    iniciar(async () => {
      if (modoVenda) {
        const itens = linhasResolvidas.map((l) => ({ item_id: l.item_id, quantidade: l.qtd }));
        if (!itens.length) { setErro("Adicione ao menos um item."); return; }
        const r = await registrarVenda({ itens, categoria_id: categoriaId || null, data });
        if (r?.erro) { setErro(r.erro); return; }
        setComItens(false); setLinhas([{ item_id: "", quantidade: "1" }]); setCategoriaId("");
      } else {
        const r = await salvarLancamento({
          tipoUI, carteira, valor: parseValorBRL(valor), descricao, data, categoria_id: categoriaId || null,
        });
        if (r?.erro) { setErro(r.erro); return; }
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["entrada", "saida", ...(usaCarteiras ? ["retirada"] as const : [])] as TipoUI[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTipoUI(t); setCategoriaId(""); if (t !== "entrada") setComItens(false); }}
            className={`flex-1 border px-2 py-2 text-sm capitalize ${tipoUI === t ? "border-marca bg-marca text-white" : "border-borda text-texto-suave"}`}>
            {t}
          </button>
        ))}
      </div>

      {usaEstoque && tipoUI === "entrada" && (
        <label className="flex items-center gap-2 text-sm text-texto">
          <input type="checkbox" checked={comItens} onChange={(e) => setComItens(e.target.checked)} /> Vender itens do catálogo (baixa o estoque)
        </label>
      )}

      {modoVenda ? (
        <div className="flex flex-col gap-2 border border-borda p-3">
          {linhas.map((l, i) => {
            const it = mapaItem.get(l.item_id);
            const qtd = parseInt(l.quantidade || "0", 10);
            const faltando = it && it.controla_estoque && qtd > it.estoque;
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <select value={l.item_id} onChange={(e) => setLinha(i, { item_id: e.target.value })} className={`${campo} flex-1`}>
                    <option value="">Escolha um item</option>
                    {itensVenda.map((iv) => <option key={iv.id} value={iv.id}>{iv.nome} — {formatarBRL(iv.preco)}</option>)}
                  </select>
                  <input value={l.quantidade} onChange={(e) => setLinha(i, { quantidade: e.target.value })} inputMode="numeric" className={`${campo} w-20`} placeholder="Qtd" />
                  {linhas.length > 1 && <button type="button" onClick={() => setLinhas((xs) => xs.filter((_, idx) => idx !== i))} className="px-2 text-texto-suave hover:text-saida">×</button>}
                </div>
                {faltando && <p className="text-xs text-saida">Estoque insuficiente (tem {it!.estoque}, vendendo {qtd}) — a venda registra mesmo assim.</p>}
              </div>
            );
          })}
          <button type="button" onClick={() => setLinhas((xs) => [...xs, { item_id: "", quantidade: "1" }])} className="self-start text-xs uppercase tracking-wider text-marca hover:opacity-80">+ adicionar item</button>
          <p className="border-t border-borda pt-2 text-sm">Total: <span className="font-semibold tabular-nums text-entrada">{formatarBRL(total)}</span></p>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">Valor
            <input className={campo} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </label>
          <label className="flex flex-col gap-1 text-sm">Descrição
            <input className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">Data
        <input type="date" max={hoje} className={campo} value={data} onChange={(e) => setData(e.target.value)} />
      </label>

      {tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Categoria
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categoriasFiltradas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      )}

      {usaCarteiras && !modoVenda && tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Carteira
          <select className={campo} value={carteira} onChange={(e) => setCarteira(e.target.value as Carteira)}>
            <option value="empresa">Empresa</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </label>
      )}

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      <button type="button" onClick={enviar} disabled={pendente}
        className="bg-marca px-4 py-2 font-semibold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Salvando..." : modoVenda ? "Registrar venda" : "Salvar lançamento"}
      </button>
    </div>
  );
}
