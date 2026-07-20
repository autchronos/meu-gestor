"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export async function salvarMetas(faturamento: number, lucro: number) {
  if (faturamento < 0 || lucro < 0) return { erro: "As metas não podem ser negativas." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase
    .from("metas")
    .update({ meta_faturamento: faturamento, meta_lucro: lucro })
    .eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível salvar as metas." };
  revalidatePath("/painel/relatorios");
  return { ok: true };
}
