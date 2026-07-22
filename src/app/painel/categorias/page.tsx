import { Tags } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { FormCategoria } from "@/app/painel/categorias/FormCategoria";
import { excluirCategoria } from "@/app/painel/categorias/acoes";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { EstadoVazio } from "@/components/EstadoVazio";

export default async function Categorias() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const { data: categorias } = await supabase
    .from("categorias").select("id, nome, tipo").eq("negocio_id", negocio.id).order("nome");
  const lista = categorias ?? [];
  const entradas = lista.filter((c) => c.tipo === "entrada");
  const saidas = lista.filter((c) => c.tipo === "saida");

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Categorias</h1>
      <FormCategoria />
      {lista.length === 0 ? (
        <EstadoVazio Icone={Tags} titulo="Nenhuma categoria ainda" descricao="Crie categorias para organizar suas entradas e saídas." />
      ) : (
        [["Entradas", entradas, "text-entrada"], ["Saídas", saidas, "text-saida"]].map(
          ([titulo, itens, cor]) => (
            <div key={titulo as string}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${cor}`}>{titulo as string}</h2>
              <ul className="mt-2 border border-borda bg-superficie">
                {(itens as { id: string; nome: string }[]).map((c, idx, arr) => (
                  <li key={c.id} className={`flex items-center justify-between px-5 py-3 text-sm text-marca ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
                    {c.nome}
                    <BotaoExcluir acao={excluirCategoria} id={c.id} />
                  </li>
                ))}
                {(itens as unknown[]).length === 0 && (
                  <li className="px-5 py-3 text-sm text-texto-suave">Nenhuma ainda.</li>
                )}
              </ul>
            </div>
          ),
        )
      )}
    </section>
  );
}
