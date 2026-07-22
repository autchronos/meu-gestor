"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { ehAdmin } from "@/lib/auth/admin";

export async function enviarSuporte(d: { tipo: "pergunta" | "sugestao"; mensagem: string; contato: string }) {
  if (!d.mensagem.trim()) return { erro: "Escreva sua mensagem." };
  if (d.tipo !== "pergunta" && d.tipo !== "sugestao") return { erro: "Tipo inválido." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  // user_id cai no default auth.uid() (a RLS garante); gravamos negocio_id + conteudo.
  const { error } = await supabase.from("suporte").insert({
    negocio_id: negocio.id, tipo: d.tipo, mensagem: d.mensagem.trim(), contato: d.contato.trim() || null,
  });
  if (error) return { erro: "Não foi possível enviar sua mensagem." };
  revalidatePath("/painel/suporte");
  return { ok: true };
}

export async function responderSuporte(d: { id: string; resposta: string; status: string }) {
  if (!(await ehAdmin())) return { erro: "Acesso negado." };
  if (!["aberto", "respondido", "resolvido"].includes(d.status)) return { erro: "Status inválido." };
  const admin = criarClienteAdmin();
  const resposta = d.resposta.trim();
  const { error } = await admin.from("suporte").update({
    resposta: resposta || null,
    respondido_em: resposta ? new Date().toISOString() : null,
    status: d.status,
  }).eq("id", d.id);
  if (error) return { erro: "Não foi possível salvar a resposta." };
  revalidatePath("/painel/suporte/admin");
  revalidatePath("/painel/suporte");
  return { ok: true };
}
