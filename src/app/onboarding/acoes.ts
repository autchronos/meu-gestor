"use server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { nichoParaRamo } from "@/lib/auth/roteamento";
import { templateDoRamo } from "@/templates/ramos";

export interface DadosOnboarding {
  nomeNegocio: string;
  nicho: string;
  whatsapp: string;
  saldoInicial: number;
}

export async function criarNegocioCompleto(dados: DadosOnboarding) {
  const supabase = criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Idempotência: se o usuário já tem negócio, não cria outro (evita duplicar
  // num retry depois de uma falha parcial de seeding).
  const { data: existente } = await supabase
    .from("negocio_usuarios")
    .select("negocio_id")
    .limit(1)
    .maybeSingle();
  if (existente) redirect("/painel");

  const ramo = nichoParaRamo(dados.nicho);

  // 1) RPC cria negócio + vínculo dono + metas, e retorna o id.
  const { data: negocioId, error: eRpc } = await supabase.rpc("criar_negocio", {
    p_nome: dados.nomeNegocio,
    p_ramo: ramo,
  });
  if (eRpc || !negocioId) {
    return { erro: eRpc?.message ?? "Não foi possível criar o negócio." };
  }

  // 2) Seeding sob RLS (o usuário já é membro). Uma falha aqui NÃO descarta o
  // negócio já criado, mas é reportada — nada de sucesso silencioso.
  const template = templateDoRamo(ramo);
  const problemas: string[] = [];

  if (dados.whatsapp.trim()) {
    const { error } = await supabase.from("negocio_telefones").insert({
      negocio_id: negocioId,
      telefone: dados.whatsapp.trim(),
    });
    if (error) {
      problemas.push("o número de WhatsApp (pode já estar vinculado a outro negócio)");
    }
  }

  if (template.categorias.length) {
    const { error } = await supabase
      .from("categorias")
      .insert(template.categorias.map((c) => ({ ...c, negocio_id: negocioId })));
    if (error) problemas.push("as categorias de exemplo");
  }

  if (template.itens.length) {
    const { error } = await supabase
      .from("itens")
      .insert(template.itens.map((i) => ({ ...i, negocio_id: negocioId })));
    if (error) problemas.push("os itens de exemplo");
  }

  if (dados.saldoInicial > 0) {
    const { error } = await supabase.from("lancamentos").insert({
      negocio_id: negocioId,
      tipo: "entrada",
      descricao: "Saldo inicial",
      valor: dados.saldoInicial,
      carteira: "empresa",
    });
    if (error) problemas.push("o saldo inicial");
  }

  if (problemas.length) {
    const aviso =
      `Seu negócio foi criado, mas não conseguimos salvar: ${problemas.join(", ")}.` +
      " Você pode ajustar isso depois no app.";
    redirect(`/painel?aviso=${encodeURIComponent(aviso)}`);
  }

  redirect("/painel");
}
