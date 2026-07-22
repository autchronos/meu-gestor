"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { resolverCliente } from "@/lib/clientes/resolver";

export interface DadosReceber {
  id?: string;
  cliente: string;      // nome (busca-ou-cria) — usado so na criacao
  descricao: string;
  valor: number;
  vencimento: string;   // "" = sem vencimento
  forma: string;        // "" = nao informado
  taxa: number;         // 0..100
}

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_fiado) return { negocio: null, erro: "Contas a receber estão desativadas nas configurações." as string };
  return { negocio, erro: "" };
}

function valida(d: DadosReceber): string | null {
  if (d.valor <= 0) return "Informe um valor maior que zero.";
  if (!d.descricao.trim()) return "Informe uma descrição.";
  if (d.taxa < 0 || d.taxa > 100) return "A taxa deve ficar entre 0 e 100%.";
  return null;
}

export async function criarReceber(d: DadosReceber) {
  const nomeCliente = d.cliente.trim();
  if (!nomeCliente) return { erro: "Informe o cliente." };
  const erro = valida(d);
  if (erro) return { erro };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const clienteId = await resolverCliente(supabase, g.negocio.id, nomeCliente);
  if (!clienteId) return { erro: "Não foi possível salvar o cliente." };
  const { error } = await supabase.from("receber").insert({
    negocio_id: g.negocio.id,
    cliente_id: clienteId,
    descricao: d.descricao.trim(),
    valor: d.valor,
    vencimento: d.vencimento || null,
    forma_pagamento: d.forma || null,
    taxa: d.taxa,
  });
  if (error) return { erro: "Não foi possível salvar a conta." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}

export async function editarReceber(d: DadosReceber) {
  if (!d.id) return { erro: "Conta inválida." };
  const erro = valida(d);
  if (erro) return { erro };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { data: atual } = await supabase.from("receber").select("pago").eq("id", d.id).maybeSingle();
  if (!atual) return { erro: "Conta não encontrada." };
  if (atual.pago) return { erro: "Não dá para editar uma conta já paga. Desmarque o pagamento primeiro." };
  const { error } = await supabase.from("receber").update({
    descricao: d.descricao.trim(),
    valor: d.valor,
    vencimento: d.vencimento || null,
    forma_pagamento: d.forma || null,
    taxa: d.taxa,
  }).eq("id", d.id);
  if (error) return { erro: "Não foi possível salvar as alterações." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}

async function setPago(id: string, pago: boolean) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("receber").update({ pago }).eq("id", id);
  if (error) return { erro: "Não foi possível atualizar a conta." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}

export const marcarPago = (id: string) => setPago(id, true);
export const desmarcarPago = (id: string) => setPago(id, false);

export async function excluirReceber(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  // Conta paga tem lancamento no caixa (receber_id ON DELETE CASCADE): excluir
  // apagaria a entrada e dessincronizaria o caixa. Exige desmarcar antes.
  const { data: atual } = await supabase.from("receber").select("pago").eq("id", id).maybeSingle();
  if (atual?.pago) return { erro: "Não dá para excluir uma conta paga. Desmarque o pagamento primeiro." };
  const { error } = await supabase.from("receber").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir a conta." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}

// Wrappers void para usar direto em <form action> das ações de "marcar pago".
// Um closure inline que só chama a ação original NÃO é uma Server Action e
// derruba a pagina em runtime; estes exports do modulo "use server" são válidos.
export async function marcarPagoForm(id: string) {
  await marcarPago(id);
}

export async function desmarcarPagoForm(id: string) {
  await desmarcarPago(id);
}
