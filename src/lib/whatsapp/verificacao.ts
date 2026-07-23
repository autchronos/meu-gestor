import type { SupabaseClient } from "@supabase/supabase-js";

export function gerarCodigoNumerico(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Chamado pelo webhook (service_role). Valida o código (existe + não expirou),
// exige correspondência única (segurança contra colisão), vincula o telefone
// do remetente ao negócio e apaga o código consumido.
export async function consumirCodigo(
  admin: SupabaseClient,
  codigo: string,
  remetente: string,
): Promise<{ negocioId: string; nomeNegocio: string } | null> {
  const agora = new Date().toISOString();
  const { data: linhas } = await admin
    .from("whatsapp_verificacoes")
    .select("negocio_id")
    .eq("codigo", codigo)
    .gt("expira_em", agora);
  if (!linhas || linhas.length !== 1) return null;

  const negocioId = linhas[0].negocio_id as string;

  const { error: eTel } = await admin
    .from("negocio_telefones")
    .upsert({ negocio_id: negocioId, telefone: remetente, verificado: true }, { onConflict: "telefone" });
  if (eTel) return null;

  const { data: neg } = await admin.from("negocios").select("nome").eq("id", negocioId).maybeSingle();
  await admin.from("whatsapp_verificacoes").delete().eq("codigo", codigo);

  return { negocioId, nomeNegocio: (neg?.nome as string) ?? "seu negócio" };
}
