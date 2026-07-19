"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { resolverLancamento, type TipoUI, type Carteira } from "@/lib/caixa/lancamento";

export interface DadosLancamento {
  id?: string;
  tipoUI: TipoUI;
  carteira: Carteira;
  valor: number;
  descricao: string;
  data: string; // YYYY-MM-DD
  categoria_id: string | null;
}

export async function salvarLancamento(d: DadosLancamento) {
  if (d.valor <= 0) return { erro: "Informe um valor maior que zero." };
  if (!d.descricao.trim()) return { erro: "Informe uma descrição." };
  if (d.data > hojeSP()) return { erro: "A data não pode ser futura." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();

  // Gating no servidor (o form já esconde, mas server action é endpoint): sem
  // carteiras, tudo é da empresa e não existe retirada.
  let carteira = d.carteira;
  if (!negocio.usa_carteiras) {
    if (d.tipoUI === "retirada") return { erro: "Retiradas estão desativadas nas configurações." };
    carteira = "empresa";
  }

  const r = resolverLancamento(d.tipoUI, carteira);

  const payload = {
    negocio_id: negocio.id,
    tipo: r.tipo,
    carteira: r.carteira,
    eh_retirada: r.eh_retirada,
    valor: d.valor,
    descricao: d.descricao.trim(),
    data: d.data,
    categoria_id: r.eh_retirada ? null : d.categoria_id,
  };

  const resp = d.id
    ? await supabase.from("lancamentos").update(payload).eq("id", d.id)
    : await supabase.from("lancamentos").insert(payload);
  if (resp.error) return { erro: "Não foi possível salvar o lançamento." };

  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
  redirect("/painel/lancamentos");
}

export async function excluirLancamento(id: string) {
  const supabase = criarClienteServidor();
  await supabase.from("lancamentos").delete().eq("id", id);
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
}
