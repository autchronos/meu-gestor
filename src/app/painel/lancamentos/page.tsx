import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { FormLancamento } from "@/app/painel/lancamentos/FormLancamento";
import { excluirLancamento } from "@/app/painel/lancamentos/acoes";

function intervaloPeriodo(periodo: string | undefined, hoje: Date) {
  const y = hoje.getFullYear(), m = hoje.getMonth();
  if (periodo === "mes_passado") return { de: new Date(y, m - 1, 1), ate: new Date(y, m, 0) };
  if (periodo === "ultimos_30") return { de: new Date(y, m, hoje.getDate() - 29), ate: hoje };
  if (periodo === "tudo") return null;
  return { de: new Date(y, m, 1), ate: new Date(y, m + 1, 0) }; // mes atual (default)
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function Lancamentos({
  searchParams,
}: { searchParams: { periodo?: string; tipo?: string; origem?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const hojeStr = new Date().toISOString().slice(0, 10);

  const { data: categorias } = await supabase.from("categorias").select("id, nome, tipo").order("nome");

  let q = supabase.from("lancamentos")
    .select("id, tipo, descricao, valor, data, origem, eh_retirada")
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(200);

  const range = intervaloPeriodo(searchParams.periodo, new Date());
  if (range) q = q.gte("data", iso(range.de)).lte("data", iso(range.ate));
  if (searchParams.tipo === "entrada" || searchParams.tipo === "saida") q = q.eq("tipo", searchParams.tipo);
  if (searchParams.origem === "app" || searchParams.origem === "whatsapp") q = q.eq("origem", searchParams.origem);

  const { data: lancamentos } = await q;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Lançamentos</h1>

      <details className="rounded-md border border-borda p-3">
        <summary className="cursor-pointer text-sm font-medium text-marca">Novo lançamento</summary>
        <div className="mt-3">
          <FormLancamento categorias={categorias ?? []} usaCarteiras={negocio.usa_carteiras} hoje={hojeStr} />
        </div>
      </details>

      <form method="get" className="flex flex-wrap gap-2 text-sm">
        <select name="periodo" defaultValue={searchParams.periodo ?? "mes_atual"} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="mes_atual">Mês atual</option>
          <option value="mes_passado">Mês passado</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="tudo">Tudo</option>
        </select>
        <select name="tipo" defaultValue={searchParams.tipo ?? ""} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>
        <select name="origem" defaultValue={searchParams.origem ?? ""} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Toda origem</option>
          <option value="app">App</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <button type="submit" className="rounded-md border border-borda px-3 py-1 text-texto-suave hover:text-texto">Filtrar</button>
      </form>

      <ul className="divide-y divide-borda rounded-md border border-borda">
        {(lancamentos ?? []).map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate text-texto">{l.descricao}{l.eh_retirada ? " (retirada)" : ""}</p>
              <p className="text-xs text-texto-suave">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")} · {l.origem}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={l.tipo === "entrada" ? "text-entrada" : "text-saida"}>
                {l.tipo === "entrada" ? "+" : "-"}{formatarBRL(Number(l.valor))}
              </span>
              <form action={excluirLancamento.bind(null, l.id)}>
                <button type="submit" className="text-xs text-texto-suave hover:text-saida">×</button>
              </form>
            </div>
          </li>
        ))}
        {(lancamentos ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-texto-suave">Nenhum lançamento no período.</li>}
      </ul>
    </section>
  );
}
