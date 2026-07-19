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

  const ramo = nichoParaRamo(dados.nicho);

  // 1) RPC cria negócio + vínculo dono + metas, e retorna o id.
  const { data: negocioId, error: eRpc } = await supabase.rpc("criar_negocio", {
    p_nome: dados.nomeNegocio,
    p_ramo: ramo,
  });
  if (eRpc || !negocioId) {
    return { erro: eRpc?.message ?? "Não foi possível criar o negócio." };
  }

  // 2) Seeding sob RLS (o usuário já é membro).
  const template = templateDoRamo(ramo);

  if (dados.whatsapp.trim()) {
    await supabase.from("negocio_telefones").insert({
      negocio_id: negocioId,
      telefone: dados.whatsapp.trim(),
    });
  }

  if (template.categorias.length) {
    await supabase
      .from("categorias")
      .insert(template.categorias.map((c) => ({ ...c, negocio_id: negocioId })));
  }

  if (template.itens.length) {
    await supabase
      .from("itens")
      .insert(template.itens.map((i) => ({ ...i, negocio_id: negocioId })));
  }

  if (dados.saldoInicial > 0) {
    await supabase.from("lancamentos").insert({
      negocio_id: negocioId,
      tipo: "entrada",
      descricao: "Saldo inicial",
      valor: dados.saldoInicial,
      carteira: "empresa",
    });
  }

  redirect("/painel");
}
