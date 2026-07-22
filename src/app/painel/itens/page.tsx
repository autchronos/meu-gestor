import { redirect } from "next/navigation";
import { Package, PackageOpen } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { estaAcabando } from "@/lib/estoque/calculos";
import { disponivelAluguel } from "@/lib/locacao/calculos";
import { FormItem, FormRepor } from "@/app/painel/itens/FormItem";
import { excluirItem } from "@/app/painel/itens/acoes";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { EstadoVazio } from "@/components/EstadoVazio";

export default async function Itens() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_estoque && !negocio.usa_locacao) redirect("/painel");
  const supabase = criarClienteServidor();

  const { data: todos } = await supabase
    .from("itens").select("id, nome, preco, unidade, tipo, controla_estoque, estoque, estoque_minimo")
    .eq("negocio_id", negocio.id).eq("ativo", true).order("nome");
  const venda = (todos ?? []).filter((i) => i.tipo === "venda");
  const aluguel = (todos ?? []).filter((i) => i.tipo === "aluguel");

  // Reserva derivada por item (locacoes abertas).
  const reservaPorItem = new Map<string, number>();
  if (negocio.usa_locacao && aluguel.length) {
    const { data: abertas } = await supabase
      .from("locacoes").select("item_id, quantidade").eq("negocio_id", negocio.id).is("devolvido_em", null);
    for (const l of abertas ?? []) reservaPorItem.set(l.item_id, (reservaPorItem.get(l.item_id) ?? 0) + Number(l.quantidade));
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Itens</h1>
      <FormItem podeVenda={negocio.usa_estoque} podeAluguel={negocio.usa_locacao} />

      {negocio.usa_estoque && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Venda</h2>
          {venda.length === 0 ? (
            <div className="mt-2"><EstadoVazio Icone={Package} titulo="Nenhum produto ainda" descricao="Cadastre seu primeiro produto no formulário acima para vender com baixa de estoque." /></div>
          ) : (
          <ul className="mt-2 border border-borda bg-superficie">
            {venda.map((it, idx, arr) => {
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
                    <BotaoExcluir acao={excluirItem} id={it.id} />
                  </div>
                  <details className="border-t border-borda">
                    <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                    <div className="p-4"><FormItem podeVenda podeAluguel={false} inicial={{ id: it.id, nome: it.nome, preco: Number(it.preco), unidade: it.unidade, controla_estoque: it.controla_estoque, estoque_minimo: Number(it.estoque_minimo), tipo: "venda" }} /></div>
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
          </ul>
          )}
        </div>
      )}

      {negocio.usa_locacao && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Aluguel</h2>
          {aluguel.length === 0 ? (
            <div className="mt-2"><EstadoVazio Icone={PackageOpen} titulo="Nenhum item de aluguel" descricao="Cadastre um item acima para começar a registrar locações." /></div>
          ) : (
          <ul className="mt-2 border border-borda bg-superficie">
            {aluguel.map((it, idx, arr) => {
              const reservado = reservaPorItem.get(it.id) ?? 0;
              const disp = disponivelAluguel(Number(it.estoque), reservado);
              return (
                <li key={it.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
                  <div className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-marca">{it.nome}</p>
                      <p className="text-xs text-texto-suave">
                        {formatarBRL(Number(it.preco))} / {it.unidade} · possui {it.estoque} · disponível <span className={disp < 0 ? "text-saida" : "text-texto"}>{disp}</span>
                      </p>
                    </div>
                    <BotaoExcluir acao={excluirItem} id={it.id} />
                  </div>
                  <details className="border-t border-borda">
                    <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                    <div className="p-4"><FormItem podeVenda={false} podeAluguel inicial={{ id: it.id, nome: it.nome, preco: Number(it.preco), unidade: it.unidade, controla_estoque: it.controla_estoque, estoque_minimo: Number(it.estoque_minimo), tipo: "aluguel" }} /></div>
                  </details>
                  <details className="border-t border-borda">
                    <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Ajustar unidades</summary>
                    <div className="px-4 pb-4"><FormRepor id={it.id} /></div>
                  </details>
                </li>
              );
            })}
          </ul>
          )}
        </div>
      )}
    </section>
  );
}
