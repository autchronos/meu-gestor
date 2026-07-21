"use client";
import { useState, useTransition } from "react";
import { criarReceber, editarReceber, type DadosReceber } from "@/app/painel/a-receber/acoes";
import { parseValorBRL } from "@/lib/formato";

const FORMAS = ["Fiado", "Cartão de crédito", "Cartão de débito", "PIX", "Boleto", "Cheque"];

// Edicao nao mexe no cliente (so na criacao), por isso Inicial nao carrega cliente.
interface Inicial { id: string; descricao: string; valor: string; vencimento: string; forma: string; taxa: string }

export function FormReceber({ nomesClientes, inicial }: { nomesClientes: string[]; inicial?: Inicial }) {
  const ed = Boolean(inicial?.id);
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial?.valor ?? "");
  const [vencimento, setVencimento] = useState(inicial?.vencimento ?? "");
  const [forma, setForma] = useState(inicial?.forma ?? "");
  const [taxa, setTaxa] = useState(inicial?.taxa ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const d: DadosReceber = {
        id: inicial?.id, cliente, descricao,
        valor: parseValorBRL(valor), vencimento,
        forma, taxa: Number(taxa.replace(",", ".")) || 0,
      };
      const r = ed ? await editarReceber(d) : await criarReceber(d);
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Conta salva!");
      if (!ed) { setCliente(""); setDescricao(""); setValor(""); setVencimento(""); setForma(""); setTaxa(""); }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!ed && (
        <>
          <input list="lista-clientes" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" className={campo} />
          <datalist id="lista-clientes">{nomesClientes.map((n) => <option key={n} value={n} />)}</datalist>
        </>
      )}
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: 2 marmitas)" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor 0,00" className={campo} />
        <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={forma} onChange={(e) => setForma(e.target.value)} className={campo}>
          <option value="">Forma de pagamento</option>
          {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input value={taxa} onChange={(e) => setTaxa(e.target.value)} inputMode="decimal" placeholder="Taxa %" className={campo} />
      </div>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : ed ? "Salvar alterações" : "Adicionar conta"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
