"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { apenasFlags, type Flags } from "@/lib/negocio/capacidades";
import { gerarCodigoNumerico } from "@/lib/whatsapp/verificacao";

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

export async function conectarWhatsApp(): Promise<{ codigo: string; link: string } | { erro: string }> {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const codigo = gerarCodigoNumerico();
  const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  // PK por negocio_id → upsert substitui o código pendente anterior.
  const { error } = await supabase
    .from("whatsapp_verificacoes")
    .upsert({ negocio_id: negocio.id, codigo, expira_em: expira }, { onConflict: "negocio_id" });
  if (error) return { erro: "Não foi possível gerar o código." };
  const numeroBot = process.env.UAZAPI_NUMERO_BOT ?? "";
  const link = `https://wa.me/${numeroBot}?text=${encodeURIComponent(`AUTCHRONOS ${codigo}`)}`;
  return { codigo, link };
}
