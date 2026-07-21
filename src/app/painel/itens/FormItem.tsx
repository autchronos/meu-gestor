"use client";
import { useState, useTransition } from "react";
import { salvarItem, reporEstoque } from "@/app/painel/itens/acoes";
import { parseValorBRL } from "@/lib/formato";

interface Inicial { id: string; nome: string; preco: number; unidade: string; controla_estoque: boolean; estoque_minimo: number; tipo: "venda" | "aluguel" }

const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

export function FormItem({ inicial, podeVenda = true, podeAluguel = false }: { inicial?: Inicial; podeVenda?: boolean; podeAluguel?: boolean }) {
  const ed = Boolean(inicial?.id);
  const [tipo, setTipo] = useState<"venda" | "aluguel">(inicial?.tipo ?? (podeVenda ? "venda" : "aluguel"));
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [preco, setPreco] = useState(inicial ? String(inicial.preco).replace(".", ",") : "");
  const [unidade, setUnidade] = useState(inicial?.unidade ?? "un");
  const [controla, setControla] = useState(inicial?.controla_estoque ?? true);
  const [estoque, setEstoque] = useState("0");
  const [minimo, setMinimo] = useState(inicial ? String(inicial.estoque_minimo) : "0");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarItem({
        id: inicial?.id, nome, preco: parseValorBRL(preco), unidade, tipo,
        controla_estoque: controla, estoque: parseInt(estoque || "0", 10),
        estoque_minimo: parseInt(minimo || "0", 10),
      });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Item salvo!");
      if (!ed) { setNome(""); setPreco(""); setUnidade("un"); setControla(true); setEstoque("0"); setMinimo("0"); }
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">{ed ? "Editar item" : "Novo item"}</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do item" className={campo} />
      {!ed && podeVenda && podeAluguel && (
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "venda" | "aluguel")} className={campo}>
          <option value="venda">Venda</option>
          <option value="aluguel">Aluguel</option>
        </select>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="Preço 0,00" className={campo} />
        <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Unidade (un, kg...)" className={campo} />
      </div>
      <label className="flex items-center gap-2 text-sm text-texto">
        <input type="checkbox" checked={controla} onChange={(e) => setControla(e.target.checked)} /> Controlar estoque deste item
      </label>
      {controla && (
        <div className="grid grid-cols-2 gap-2">
          {!ed && <input value={estoque} onChange={(e) => setEstoque(e.target.value)} inputMode="numeric" placeholder="Estoque inicial" className={campo} />}
          <input value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="numeric" placeholder="Estoque mínimo" className={campo} />
        </div>
      )}
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}

export function FormRepor({ id }: { id: string }) {
  const [qtd, setQtd] = useState("");
  const [pago, setPago] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function repor(sinal: 1 | -1) {
    const q = parseInt(qtd || "0", 10);
    if (!q) { setMsg("Informe a quantidade."); return; }
    setMsg(null);
    iniciar(async () => {
      const r = await reporEstoque(id, sinal * q, sinal === 1 ? parseValorBRL(pago) : 0);
      if (!r?.erro) { setQtd(""); setPago(""); }
      setMsg(r?.erro ?? (sinal === 1 ? "Estoque reposto!" : "Baixa registrada."));
    });
  }

  return (
    <div className="flex flex-col gap-2 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" placeholder="Quantidade" className={campo} />
        <input value={pago} onChange={(e) => setPago(e.target.value)} inputMode="decimal" placeholder="Paguei (opcional)" className={campo} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => repor(1)} disabled={pendente}
          className="flex-1 border border-entrada px-3 py-2 text-sm font-semibold uppercase tracking-wider text-entrada transition-colors hover:bg-entrada hover:text-white disabled:opacity-60">Repor</button>
        <button type="button" onClick={() => repor(-1)} disabled={pendente}
          className="flex-1 border border-borda px-3 py-2 text-sm font-semibold uppercase tracking-wider text-texto-suave transition-colors hover:text-saida disabled:opacity-60">Tirar (perda)</button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
