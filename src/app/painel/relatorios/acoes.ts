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

export async function salvarReserva(alvo: number, prazo: string, saldoMinimo: number) {
  if (alvo < 0 || saldoMinimo < 0) return { erro: "Os valores não podem ser negativos." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("metas")
    .update({ reserva_alvo: alvo, reserva_prazo: prazo || null, saldo_minimo: saldoMinimo })
    .eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível salvar a reserva." };
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel");
  return { ok: true };
}

export async function ajustarReserva(delta: number) {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { data: m } = await supabase.from("metas").select("valor_reservado").eq("negocio_id", negocio.id).maybeSingle();
  const novo = Math.max(0, Number(m?.valor_reservado ?? 0) + delta);
  const { error } = await supabase.from("metas").update({ valor_reservado: novo }).eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível atualizar a reserva." };
  revalidatePath("/painel/relatorios");
  return { ok: true };
}
