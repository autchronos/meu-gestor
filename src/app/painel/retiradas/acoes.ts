"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { resolverLancamento } from "@/lib/caixa/lancamento";

export async function definirLimite(valor: number) {
  if (valor < 0) return { erro: "O limite não pode ser negativo." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  if (!negocio.usa_carteiras) return { erro: "Retiradas estão desativadas." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("metas").update({ limite_prolabore: valor }).eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível salvar o limite." };
  revalidatePath("/painel");
  revalidatePath("/painel/retiradas");
  return { ok: true };
}

export async function registrarRetirada(valor: number, descricao: string) {
  if (valor <= 0) return { erro: "Informe um valor maior que zero." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  if (!negocio.usa_carteiras) return { erro: "Retiradas estão desativadas." };
  const supabase = criarClienteServidor();
  const r = resolverLancamento("retirada", "empresa");
  const { error } = await supabase.from("lancamentos").insert({
    negocio_id: negocio.id,
    tipo: r.tipo,
    carteira: r.carteira,
    eh_retirada: r.eh_retirada,
    valor,
    descricao: descricao.trim() || "Retirada",
    data: hojeSP(),
    categoria_id: null,
  });
  if (error) return { erro: "Não foi possível registrar a retirada." };
  revalidatePath("/painel");
  revalidatePath("/painel/retiradas");
  return { ok: true };
}
