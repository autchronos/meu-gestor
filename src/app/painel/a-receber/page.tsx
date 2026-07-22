import { redirect } from "next/navigation";
import { HandCoins } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { hojeSP } from "@/lib/caixa/periodo";
import { liquido, estaVencida } from "@/lib/receber/calculos";
import { FormReceber } from "@/app/painel/a-receber/FormReceber";
import { marcarPagoForm, desmarcarPagoForm, excluirReceber } from "@/app/painel/a-receber/acoes";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { EstadoVazio } from "@/components/EstadoVazio";

type Linha = {
  id: string; descricao: string; valor: number; vencimento: string | null;
  forma_pagamento: string | null; taxa: number; clientes: { nome: string } | null;
};

export default async function AReceber({ searchParams }: { searchParams: { novo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_fiado) redirect("/painel");
  const supabase = criarClienteServidor();
  const hoje = hojeSP();
  const sel = "id, descricao, valor, vencimento, forma_pagamento, taxa, clientes(nome)";

  const [{ data: abertasRaw }, { data: pagasRaw }, { data: clientes }] = await Promise.all([
    supabase.from("receber").select(sel).eq("negocio_id", negocio.id).eq("pago", false)
      .order("vencimento", { ascending: true, nullsFirst: false }),
    supabase.from("receber").select(sel).eq("negocio_id", negocio.id).eq("pago", true)
      .order("data", { ascending: false }).limit(100),
    supabase.from("clientes").select("nome").eq("negocio_id", negocio.id).order("nome"),
  ]);

  const abertas = (abertasRaw ?? []) as unknown as Linha[];
  const pagas = (pagasRaw ?? []) as unknown as Linha[];
  const totalAberto = abertas.reduce((a, r) => a + Number(r.valor), 0);
  const nomes = (clientes ?? []).map((c) => c.nome);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">A receber</h1>

      <details open={searchParams?.novo === "1"} className="border border-borda bg-superficie">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Nova conta a receber</summary>
        <div className="border-t border-borda p-4"><FormReceber nomesClientes={nomes} /></div>
      </details>

      <div className="border border-borda bg-superficie p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">Total a receber</p>
        <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-texto">{formatarBRL(totalAberto)}</p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Abertas</h2>
      {abertas.length === 0 ? (
        <EstadoVazio Icone={HandCoins} titulo="Nenhuma conta em aberto" descricao="As vendas a prazo que você registrar aparecem aqui até serem pagas." />
      ) : (
      <ul className="border border-borda bg-superficie">
        {abertas.map((r, idx, arr) => {
          const vencida = estaVencida(r.vencimento, hoje);
          return (
            <li key={r.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{r.clientes?.nome ?? "—"} · {r.descricao}</p>
                  <p className="text-xs text-texto-suave">
                    {r.vencimento ? <span className={vencida ? "text-saida" : ""}>vence {r.vencimento}{vencida ? " (vencida)" : ""}</span> : "sem vencimento"}
                    {r.forma_pagamento ? ` · ${r.forma_pagamento}` : ""}
                    {r.taxa > 0 ? ` · taxa ${r.taxa}% → líquido ${formatarBRL(liquido(Number(r.valor), Number(r.taxa)))}` : ""}
                  </p>
                </div>
                <span className="tabular-nums text-texto">{formatarBRL(Number(r.valor))}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-borda px-5 py-2">
                <form action={marcarPagoForm.bind(null, r.id)}>
                  <button type="submit" className="text-xs font-semibold uppercase tracking-wider text-entrada hover:opacity-80">Marcar pago</button>
                </form>
                <BotaoExcluir acao={excluirReceber} id={r.id} />
                <details className="w-full">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                  <div className="pt-3">
                    <FormReceber nomesClientes={nomes} inicial={{
                      id: r.id, descricao: r.descricao, valor: String(Number(r.valor)).replace(".", ","),
                      vencimento: r.vencimento ?? "", forma: r.forma_pagamento ?? "", taxa: String(Number(r.taxa)).replace(".", ","),
                    }} />
                  </div>
                </details>
              </div>
            </li>
          );
        })}
      </ul>
      )}

      {pagas.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-texto-suave">Pagas</h2>
          <ul className="border border-borda bg-superficie">
            {pagas.map((r, idx, arr) => (
              <li key={r.id} className={`flex items-center justify-between px-5 py-3 text-sm ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
                <div>
                  <p className="text-marca">{r.clientes?.nome ?? "—"} · {r.descricao}</p>
                  <p className="text-xs text-texto-suave">recebido{r.taxa > 0 ? ` · líquido ${formatarBRL(liquido(Number(r.valor), Number(r.taxa)))}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-texto-suave">{formatarBRL(Number(r.valor))}</span>
                  <form action={desmarcarPagoForm.bind(null, r.id)}>
                    <button type="submit" className="text-xs text-texto-suave hover:text-marca">Desmarcar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
