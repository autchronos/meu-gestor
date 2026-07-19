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
