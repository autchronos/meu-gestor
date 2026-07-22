import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { FormCliente } from "@/app/painel/clientes/FormCliente";
import { excluirCliente } from "@/app/painel/clientes/acoes";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { EstadoVazio } from "@/components/EstadoVazio";

export default async function Clientes() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_fiado && !negocio.usa_locacao) redirect("/painel");
  const supabase = criarClienteServidor();

  const [{ data: clientes }, { data: abertas }] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone, tipo").eq("negocio_id", negocio.id).order("nome"),
    supabase.from("receber").select("cliente_id, valor").eq("negocio_id", negocio.id).eq("pago", false),
  ]);

  const devePor = new Map<string, number>();
  for (const r of abertas ?? []) devePor.set(r.cliente_id, (devePor.get(r.cliente_id) ?? 0) + Number(r.valor));

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Clientes</h1>
      <FormCliente />
      {(clientes ?? []).length === 0 ? (
        <EstadoVazio Icone={Users} titulo="Nenhum cliente ainda" descricao="Seus clientes aparecem aqui conforme você registra vendas fiado e locações." />
      ) : (
        <ul className="border border-borda bg-superficie">
          {(clientes ?? []).map((c, idx, arr) => (
            <li key={c.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{c.nome}</p>
                  {c.telefone && <p className="text-xs text-texto-suave">{c.telefone}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {devePor.get(c.id) ? (
                    <span className="tabular-nums text-texto-suave">deve {formatarBRL(devePor.get(c.id)!)}</span>
                  ) : null}
                  <BotaoExcluir acao={excluirCliente} id={c.id} />
                </div>
              </div>
              <details className="border-t border-borda">
                <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                <div className="p-4"><FormCliente inicial={{ id: c.id, nome: c.nome, telefone: c.telefone, tipo: c.tipo }} /></div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
