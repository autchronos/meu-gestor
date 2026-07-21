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

export interface LinhaVendaInput { item_id: string; quantidade: number }

export async function registrarVenda(d: { itens: LinhaVendaInput[]; categoria_id: string | null; data: string }) {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  if (!negocio.usa_estoque) return { erro: "Estoque está desativado nas configurações." };
  const linhas = d.itens.filter((i) => i.item_id && i.quantidade > 0);
  if (!linhas.length) return { erro: "Adicione ao menos um item com quantidade." };
  if (d.data > hojeSP()) return { erro: "A data não pode ser futura." };
  const supabase = criarClienteServidor();

  // Precos autoritativos do servidor (nunca confiar no cliente).
  const ids = [...new Set(linhas.map((l) => l.item_id))];
  const { data: itens } = await supabase
    .from("itens").select("id, nome, preco").eq("negocio_id", negocio.id).eq("ativo", true).in("id", ids);
  const mapa = new Map((itens ?? []).map((i) => [i.id, i]));
  if (mapa.size !== ids.length) return { erro: "Algum item não foi encontrado." };

  const detalhes = linhas.map((l) => {
    const it = mapa.get(l.item_id)!;
    return { item_id: l.item_id, quantidade: Math.trunc(l.quantidade), preco_unitario: Number(it.preco), nome: it.nome };
  });
  const valor = Math.round(detalhes.reduce((a, x) => a + x.quantidade * x.preco_unitario, 0) * 100) / 100;
  const descricao = detalhes.map((x) => `${x.quantidade}× ${x.nome}`).join(", ");

  const { data: lanc, error: eLanc } = await supabase.from("lancamentos").insert({
    negocio_id: negocio.id, tipo: "entrada", carteira: "empresa", eh_retirada: false,
    valor, descricao, data: d.data, categoria_id: d.categoria_id,
  }).select("id").single();
  if (eLanc || !lanc) return { erro: "Não foi possível registrar a venda." };

  const { error: eItens } = await supabase.from("lancamento_itens").insert(
    detalhes.map((x) => ({ lancamento_id: lanc.id, item_id: x.item_id, quantidade: x.quantidade, preco_unitario: x.preco_unitario })),
  );
  if (eItens) {
    // Rollback: sem os itens, a venda ficaria sem baixa de estoque.
    await supabase.from("lancamentos").delete().eq("id", lanc.id);
    return { erro: "Não foi possível registrar os itens da venda." };
  }
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
  revalidatePath("/painel/itens");
  return { ok: true };
}

export async function excluirLancamento(id: string) {
  const supabase = criarClienteServidor();
  await supabase.from("lancamentos").delete().eq("id", id);
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
}
