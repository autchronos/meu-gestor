import { criarClienteServidor } from "@/lib/supabase/servidor";

type Cli = ReturnType<typeof criarClienteServidor>;

// Busca (case-insensitive) ou cria o cliente; devolve o id. A UNIQUE (0009)
// barra a corrida de duplo-clique -> re-busca no 23505.
export async function resolverCliente(supabase: Cli, negocioId: string, nome: string): Promise<string | null> {
  const { data: existente } = await supabase
    .from("clientes").select("id").eq("negocio_id", negocioId).ilike("nome", nome).maybeSingle();
  if (existente?.id) return existente.id;
  const { data: novo, error } = await supabase
    .from("clientes").insert({ negocio_id: negocioId, nome, tipo: "pessoa" }).select("id").single();
  if (novo?.id) return novo.id;
  if (error?.code === "23505") {
    const { data: r } = await supabase
      .from("clientes").select("id").eq("negocio_id", negocioId).ilike("nome", nome).maybeSingle();
    return r?.id ?? null;
  }
  return null;
}
