"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export type TipoCliente = "pessoa" | "empresa";

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_fiado) return { negocio: null, erro: "Clientes estão desativados nas configurações." as string };
  return { negocio, erro: "" };
}

export async function salvarCliente(d: { id?: string; nome: string; telefone: string; tipo: TipoCliente }) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "Informe o nome do cliente." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const payload = { negocio_id: g.negocio.id, nome, telefone: d.telefone.trim() || null, tipo: d.tipo };
  const resp = d.id
    ? await supabase.from("clientes").update(payload).eq("id", d.id)
    : await supabase.from("clientes").insert(payload);
  if (resp.error) {
    return { erro: resp.error.code === "23505" ? "Já existe um cliente com esse nome." : "Não foi possível salvar o cliente." };
  }
  revalidatePath("/painel/clientes");
  revalidatePath("/painel/a-receber"); // o datalist de nomes vive la
  return { ok: true };
}

export async function excluirCliente(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { count } = await supabase
    .from("receber").select("id", { count: "exact", head: true }).eq("cliente_id", id);
  if ((count ?? 0) > 0) return { erro: "Esse cliente tem contas a receber. Quite ou exclua as contas antes." };
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir o cliente." };
  revalidatePath("/painel/clientes");
  revalidatePath("/painel/a-receber");
  return { ok: true };
}

// Wrapper void para usar direto em <form action> (Server Action registrada).
// Um closure inline que só chama excluirCliente NÃO é uma Server Action e
// derruba a pagina em runtime; este export do modulo "use server" é válido.
export async function excluirClienteForm(id: string) {
  await excluirCliente(id);
}
