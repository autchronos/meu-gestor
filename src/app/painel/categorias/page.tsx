import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormCategoria } from "@/app/painel/categorias/FormCategoria";
import { excluirCategoria } from "@/app/painel/categorias/acoes";

export default async function Categorias() {
  const supabase = criarClienteServidor();
  const { data: categorias } = await supabase
    .from("categorias").select("id, nome, tipo").order("nome");
  const lista = categorias ?? [];
  const entradas = lista.filter((c) => c.tipo === "entrada");
  const saidas = lista.filter((c) => c.tipo === "saida");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Categorias</h1>
      <FormCategoria />
      {[["Entradas", entradas, "text-entrada"], ["Saídas", saidas, "text-saida"]].map(
        ([titulo, itens, cor]) => (
          <div key={titulo as string}>
            <h2 className={`text-sm font-semibold ${cor}`}>{titulo as string}</h2>
            <ul className="mt-2 divide-y divide-borda rounded-md border border-borda">
              {(itens as { id: string; nome: string }[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm text-texto">
                  {c.nome}
                  <form action={excluirCategoria.bind(null, c.id)}>
                    <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                  </form>
                </li>
              ))}
              {(itens as unknown[]).length === 0 && (
                <li className="px-3 py-2 text-sm text-texto-suave">Nenhuma ainda.</li>
              )}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}
