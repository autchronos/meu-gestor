"use client";
import { useState, useTransition } from "react";
import { registrarLocacao, type DadosLocacao } from "@/app/painel/locacoes/acoes";
import { parseValorBRL } from "@/lib/formato";
import { disponivelAluguel } from "@/lib/locacao/calculos";

interface ItemAluguel { id: string; nome: string; preco: number; estoque: number; reservado: number }

export function FormLocacao({ itens, nomesClientes, usaFiado, hoje }: {
  itens: ItemAluguel[]; nomesClientes: string[]; usaFiado: boolean; hoje: string;
}) {
  const [cliente, setCliente] = useState("");
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("1");
  const [valor, setValor] = useState("");
  const [retirada, setRetirada] = useState(hoje);
  const [prevista, setPrevista] = useState("");
  const [pagamento, setPagamento] = useState<DadosLocacao["pagamento"]>("recebido");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  const item = itens.find((i) => i.id === itemId);
  const q = parseInt(qtd || "0", 10);
  const disp = item ? disponivelAluguel(item.estoque, item.reservado) : 0;
  const faltando = item && q > disp;

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await registrarLocacao({
        cliente, item_id: itemId, quantidade: q, valor: parseValorBRL(valor),
        data_retirada: retirada, devolucao_prevista: prevista, pagamento,
      });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Locação registrada!");
      setCliente(""); setItemId(""); setQtd("1"); setValor(""); setPrevista(""); setPagamento("recebido");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input list="lista-clientes-loc" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" className={campo} />
      <datalist id="lista-clientes-loc">{nomesClientes.map((n) => <option key={n} value={n} />)}</datalist>
      <div className="grid grid-cols-2 gap-2">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={campo}>
          <option value="">Escolha o item</option>
          {itens.map((i) => <option key={i.id} value={i.id}>{i.nome} (disp. {disponivelAluguel(i.estoque, i.reservado)})</option>)}
        </select>
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" placeholder="Qtd" className={campo} />
      </div>
      {faltando && <p className="text-xs text-saida">Disponível insuficiente (tem {disp}, alugando {q}) — registra mesmo assim.</p>}
      <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor 0,00" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-texto-suave">Retirada
          <input type="date" value={retirada} onChange={(e) => setRetirada(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-texto-suave">Devolução prevista
          <input type="date" value={prevista} onChange={(e) => setPrevista(e.target.value)} className={campo} />
        </label>
      </div>
      <select value={pagamento} onChange={(e) => setPagamento(e.target.value as DadosLocacao["pagamento"])} className={campo}>
        <option value="recebido">Recebido agora (entra no caixa)</option>
        {usaFiado && <option value="receber">A receber</option>}
        <option value="nenhum">Não lançar agora</option>
      </select>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Registrar locação"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
