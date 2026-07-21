import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { estaAcabando } from "@/lib/estoque/calculos";
import { FormItem, FormRepor } from "@/app/painel/itens/FormItem";
import { excluirItemForm } from "@/app/painel/itens/acoes";

export default async function Itens() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_estoque) redirect("/painel");
  const supabase = criarClienteServidor();
  const { data: itens } = await supabase
    .from("itens").select("id, nome, preco, unidade, controla_estoque, estoque, estoque_minimo")
    .eq("negocio_id", negocio.id).eq("tipo", "venda").eq("ativo", true).order("nome");

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Itens</h1>
      <FormItem />
      <ul className="border border-borda bg-superficie">
        {(itens ?? []).map((it, idx, arr) => {
          // Vinho quando está no/abaixo do mínimo OU negativo (venda além do estoque).
          const alerta = estaAcabando(Number(it.estoque), Number(it.estoque_minimo), it.controla_estoque) || Number(it.estoque) < 0;
          return (
            <li key={it.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{it.nome}</p>
                  <p className="text-xs text-texto-suave">
                    {formatarBRL(Number(it.preco))} / {it.unidade}
                    {it.controla_estoque && <> · estoque <span className={alerta ? "text-saida" : "text-texto"}>{it.estoque}</span>{alerta ? " (acabando)" : ""}</>}
                  </p>
                </div>
                <form action={excluirItemForm.bind(null, it.id)}>
                  <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                </form>
              </div>
              <details className="border-t border-borda">
                <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                <div className="p-4"><FormItem inicial={{ id: it.id, nome: it.nome, preco: Number(it.preco), unidade: it.unidade, controla_estoque: it.controla_estoque, estoque_minimo: Number(it.estoque_minimo) }} /></div>
              </details>
              {it.controla_estoque && (
                <details className="border-t border-borda">
                  <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Repor / tirar estoque</summary>
                  <div className="px-4 pb-4"><FormRepor id={it.id} /></div>
                </details>
              )}
            </li>
          );
        })}
        {(itens ?? []).length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhum item ainda.</li>}
      </ul>
    </section>
  );
}
