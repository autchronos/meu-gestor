import { redirect } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { hojeSP } from "@/lib/caixa/periodo";
import { estaAtrasada } from "@/lib/locacao/calculos";
import { FormLocacao } from "@/app/painel/locacoes/FormLocacao";
import { marcarDevolucaoForm, excluirLocacao } from "@/app/painel/locacoes/acoes";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { EstadoVazio } from "@/components/EstadoVazio";

type Linha = {
  id: string; quantidade: number; valor: number; data_retirada: string;
  devolucao_prevista: string; devolvido_em: string | null;
  itens: { nome: string } | null; clientes: { nome: string } | null;
};

export default async function Locacoes({ searchParams }: { searchParams: { novo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_locacao) redirect("/painel");
  const supabase = criarClienteServidor();
  const hoje = hojeSP();
  const sel = "id, quantidade, valor, data_retirada, devolucao_prevista, devolvido_em, itens(nome), clientes(nome)";

  const [{ data: itensRaw }, { data: abertasRaw }, { data: clientes }, { data: devolvidasRaw }] = await Promise.all([
    supabase.from("itens").select("id, nome, preco, estoque").eq("negocio_id", negocio.id).eq("tipo", "aluguel").eq("ativo", true).order("nome"),
    supabase.from("locacoes").select(sel).eq("negocio_id", negocio.id).is("devolvido_em", null).order("devolucao_prevista"),
    supabase.from("clientes").select("nome").eq("negocio_id", negocio.id).order("nome"),
    supabase.from("locacoes").select(sel).eq("negocio_id", negocio.id).not("devolvido_em", "is", null).order("devolvido_em", { ascending: false }).limit(100),
  ]);

  // Reserva (locacoes abertas) por item para o disponivel no form.
  const reservaPorItem = new Map<string, number>();
  const { data: abertasQtd } = await supabase.from("locacoes").select("item_id, quantidade").eq("negocio_id", negocio.id).is("devolvido_em", null);
  for (const l of abertasQtd ?? []) reservaPorItem.set(l.item_id, (reservaPorItem.get(l.item_id) ?? 0) + Number(l.quantidade));

  const itens = (itensRaw ?? []).map((i) => ({ id: i.id, nome: i.nome, preco: Number(i.preco), estoque: Number(i.estoque), reservado: reservaPorItem.get(i.id) ?? 0 }));
  const abertas = (abertasRaw ?? []) as unknown as Linha[];
  const devolvidas = (devolvidasRaw ?? []) as unknown as Linha[];
  const nomes = (clientes ?? []).map((c) => c.nome);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Locações</h1>

      <details open={searchParams?.novo === "1"} className="border border-borda bg-superficie">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Nova locação</summary>
        <div className="border-t border-borda p-4"><FormLocacao itens={itens} nomesClientes={nomes} usaFiado={negocio.usa_fiado} hoje={hoje} /></div>
      </details>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Na rua</h2>
      {abertas.length === 0 ? (
        <EstadoVazio Icone={PackageOpen} titulo="Nenhuma locação em aberto" descricao="Quando você alugar um item, ele aparece aqui até a devolução." />
      ) : (
      <ul className="border border-borda bg-superficie">
        {abertas.map((l, idx, arr) => {
          const atrasada = estaAtrasada(l.devolucao_prevista, l.devolvido_em, hoje);
          return (
            <li key={l.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{l.itens?.nome ?? "—"} · {l.clientes?.nome ?? "—"} {l.quantidade > 1 ? `(${l.quantidade})` : ""}</p>
                  <p className="text-xs text-texto-suave">
                    <span className={atrasada ? "text-saida" : ""}>devolver {l.devolucao_prevista}{atrasada ? " (atrasada)" : ""}</span> · {formatarBRL(Number(l.valor))}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-borda px-5 py-2">
                <form action={marcarDevolucaoForm.bind(null, l.id)}>
                  <button type="submit" className="text-xs font-semibold uppercase tracking-wider text-entrada hover:opacity-80">Marcar devolução</button>
                </form>
                <BotaoExcluir acao={excluirLocacao} id={l.id} />
              </div>
            </li>
          );
        })}
      </ul>
      )}

      {devolvidas.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-texto-suave">Devolvidas</h2>
          <ul className="border border-borda bg-superficie">
            {devolvidas.map((l, idx, arr) => (
              <li key={l.id} className={`flex items-center justify-between px-5 py-3 text-sm ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
                <div>
                  <p className="text-marca">{l.itens?.nome ?? "—"} · {l.clientes?.nome ?? "—"}</p>
                  <p className="text-xs text-texto-suave">devolvida {l.devolvido_em}</p>
                </div>
                <span className="tabular-nums text-texto-suave">{formatarBRL(Number(l.valor))}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
