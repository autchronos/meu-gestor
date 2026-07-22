"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

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
