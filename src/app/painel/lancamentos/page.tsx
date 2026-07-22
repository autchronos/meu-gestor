import { ScrollText } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { hojeSP, intervaloPeriodo } from "@/lib/caixa/periodo";
import { FormLancamento } from "@/app/painel/lancamentos/FormLancamento";
import { excluirLancamento } from "@/app/painel/lancamentos/acoes";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { EstadoVazio } from "@/components/EstadoVazio";

export default async function Lancamentos({
  searchParams,
}: { searchParams: { periodo?: string; tipo?: string; origem?: string; novo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const hojeStr = hojeSP();

  const { data: categorias } = await supabase
    .from("categorias").select("id, nome, tipo").eq("negocio_id", negocio.id).order("nome");

  const { data: itensVenda } = negocio.usa_estoque
    ? await supabase.from("itens").select("id, nome, preco, unidade, estoque, controla_estoque")
        .eq("negocio_id", negocio.id).eq("tipo", "venda").eq("ativo", true).order("nome")
    : { data: [] };

  let q = supabase.from("lancamentos")
    .select("id, tipo, descricao, valor, data, origem, eh_retirada")
    .eq("negocio_id", negocio.id)
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(200);

  const range = intervaloPeriodo(searchParams.periodo, hojeStr);
  if (range) q = q.gte("data", range.de).lte("data", range.ate);
  if (searchParams.tipo === "entrada" || searchParams.tipo === "saida") q = q.eq("tipo", searchParams.tipo);
  if (searchParams.origem === "app" || searchParams.origem === "whatsapp") q = q.eq("origem", searchParams.origem);
  const { data: lancamentos } = await q;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Lançamentos</h1>

      <details open={searchParams?.novo === "1"} className="border border-borda bg-superficie">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Novo lançamento</summary>
        <div className="border-t border-borda p-4">
          <FormLancamento categorias={categorias ?? []} usaCarteiras={negocio.usa_carteiras} hoje={hojeStr}
            usaEstoque={negocio.usa_estoque}
            itensVenda={(itensVenda ?? []).map((i) => ({ ...i, preco: Number(i.preco) }))} />
        </div>
      </details>

      <form method="get" className="flex flex-wrap gap-2 text-sm">
        <select name="periodo" defaultValue={searchParams.periodo ?? "mes_atual"} className="border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="mes_atual">Mês atual</option>
          <option value="mes_passado">Mês passado</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="tudo">Tudo</option>
        </select>
        <select name="tipo" defaultValue={searchParams.tipo ?? ""} className="border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option>
        </select>
        <select name="origem" defaultValue={searchParams.origem ?? ""} className="border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Toda origem</option><option value="app">App</option><option value="whatsapp">WhatsApp</option>
        </select>
        <button type="submit" className="border border-borda px-3 py-1 uppercase tracking-wider text-texto-suave hover:text-texto">Filtrar</button>
      </form>

      {(lancamentos ?? []).length === 0 ? (
        <EstadoVazio Icone={ScrollText} titulo="Nenhum lançamento no período" descricao="Ajuste o filtro acima ou registre uma entrada/saída no formulário." />
      ) : (
        <ul className="border border-borda bg-superficie">
          {(lancamentos ?? []).map((l, idx) => (
            <li key={l.id} className={`flex items-center justify-between gap-2 px-5 py-3 text-sm ${idx !== (lancamentos ?? []).length - 1 ? "border-b border-borda" : ""}`}>
              <div className="min-w-0">
                <p className="truncate text-marca">{l.descricao}{l.eh_retirada ? " (retirada)" : ""}</p>
                <p className="text-xs text-texto-suave">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")} · {l.origem}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`tabular-nums ${l.tipo === "entrada" ? "text-entrada" : "text-saida"}`}>
                  {l.tipo === "entrada" ? "+" : "−"}{formatarBRL(Number(l.valor))}
                </span>
                <BotaoExcluir acao={excluirLancamento} id={l.id} label="excluir" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
