"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { apenasFlags, type Flags } from "@/lib/negocio/capacidades";

export async function salvarCapacidades(flags: Flags) {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("negocios").update(apenasFlags(flags)).eq("id", negocio.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/painel");
  return { ok: true };
}

export async function renomearNegocio(nome: string) {
  const limpo = nome.trim();
  if (!limpo) return { erro: "Informe o nome do negócio." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("negocios").update({ nome: limpo }).eq("id", negocio.id);
  if (error) return { erro: "Não foi possível salvar o nome." };
  revalidatePath("/painel");
  revalidatePath("/painel/configuracoes");
  return { ok: true };
}
