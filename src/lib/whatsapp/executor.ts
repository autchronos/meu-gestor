// src/lib/whatsapp/executor.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comando } from "@/lib/whatsapp/comandos";
import { hojeSP } from "@/lib/caixa/periodo";
import {
  mensagemAjuda, mensagemRegistrado, mensagemSaldo, mensagemEstoque, mensagemEstoqueDesativado,
} from "@/lib/whatsapp/respostas";

export interface NegocioWhats { id: string; nome: string; usa_estoque: boolean }

export async function resolverNegocioPorTelefone(
  admin: SupabaseClient,
  telefone: string,
): Promise<NegocioWhats | null> {
  const { data } = await admin
    .from("negocio_telefones")
    .select("negocios(id, nome, usa_estoque)")
    .eq("telefone", telefone)
    .eq("verificado", true)
    .maybeSingle();
  const n = (data as { negocios?: NegocioWhats } | null)?.negocios;
  return n ?? null;
}

// Saldo disponivel (empresa) somado no servidor via RPC saldo_empresa — evita o
// teto de 1000 linhas do PostgREST. NAO usa resumo_dashboard (aquele faz e_membro
// e estouraria sob service_role). saldo_empresa nao checa e_membro: e service-role-only.
async function disponivel(admin: SupabaseClient, negocioId: string): Promise<number> {
  const { data } = await admin.rpc("saldo_empresa", { p_negocio_id: negocioId });
  return Number(data ?? 0);
}

export async function executarComando(
  admin: SupabaseClient,
  negocio: NegocioWhats,
  cmd: Comando,
  messageId: string,
): Promise<string> {
  if (cmd.tipo === "entrada" || cmd.tipo === "saida") {
    const descricao = cmd.descricao || (cmd.tipo === "entrada" ? "Venda" : "Despesa");
    // Idempotência: reentrega do webhook não duplica (UNIQUE negocio_id,origem_msg_id).
    await admin.from("lancamentos").upsert(
      {
        negocio_id: negocio.id, tipo: cmd.tipo, carteira: "empresa", eh_retirada: false,
        valor: cmd.valor, descricao, data: hojeSP(), origem: "whatsapp", origem_msg_id: messageId,
      },
      { onConflict: "negocio_id,origem_msg_id", ignoreDuplicates: true },
    );
    return mensagemRegistrado(cmd.tipo, cmd.valor, descricao, await disponivel(admin, negocio.id));
  }

  if (cmd.tipo === "consulta_saldo") {
    const hoje = hojeSP();
    const { data: lancs } = await admin
      .from("lancamentos").select("tipo, valor")
      .eq("negocio_id", negocio.id).eq("carteira", "empresa").eq("data", hoje);
    let entradas = 0, saidas = 0;
    for (const l of lancs ?? []) {
      if (l.tipo === "entrada") entradas += Number(l.valor);
      else saidas += Number(l.valor);
    }
    return mensagemSaldo(await disponivel(admin, negocio.id), entradas, saidas);
  }

  if (cmd.tipo === "consulta_estoque") {
    if (!negocio.usa_estoque) return mensagemEstoqueDesativado();
    let q = admin
      .from("itens").select("nome, estoque")
      .eq("negocio_id", negocio.id).eq("ativo", true).eq("controla_estoque", true).order("nome");
    if (cmd.filtro) q = q.ilike("nome", `%${cmd.filtro}%`);
    const { data: itens } = await q;
    return mensagemEstoque((itens ?? []).map((i) => ({ nome: i.nome, estoque: Number(i.estoque) })), cmd.filtro);
  }

  return mensagemAjuda();
}
