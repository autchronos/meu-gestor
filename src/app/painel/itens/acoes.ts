"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_estoque && !negocio.usa_locacao) return { negocio: null, erro: "Itens estão desativados nas configurações." as string };
  return { negocio, erro: "" };
}

export interface DadosItem {
  id?: string; nome: string; preco: number; unidade: string; tipo: "venda" | "aluguel";
  controla_estoque: boolean; estoque: number; estoque_minimo: number;
}

export async function salvarItem(d: DadosItem) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "Informe o nome do item." };
  if (d.preco < 0) return { erro: "O preço não pode ser negativo." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  if (d.tipo === "venda" && !g.negocio.usa_estoque) return { erro: "Vendas com estoque estão desativadas." };
  if (d.tipo === "aluguel" && !g.negocio.usa_locacao) return { erro: "Aluguel está desativado." };
  const supabase = criarClienteServidor();
  // Base: campos editaveis. O estoque e o tipo so entram na CRIACAO (depois
  // estoque muda via venda/reposicao, nunca por edicao do cadastro; tipo nao muda).
  const base = {
    negocio_id: g.negocio.id, nome, preco: d.preco, unidade: d.unidade.trim() || "un",
    controla_estoque: d.controla_estoque, estoque_minimo: Math.max(0, Math.trunc(d.estoque_minimo)),
  };
  const resp = d.id
    ? await supabase.from("itens").update(base).eq("id", d.id)
    : await supabase.from("itens").insert({ ...base, tipo: d.tipo, estoque: Math.trunc(d.estoque) });
  if (resp.error) return { erro: "Não foi possível salvar o item." };
  revalidatePath("/painel/itens");
  revalidatePath("/painel/lancamentos");
  revalidatePath("/painel"); // item novo pode já entrar como "acabando" no alerta
  return { ok: true };
}

export async function excluirItem(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  // ativo=false preserva o historico de vendas (lancamento_itens tem RESTRICT).
  const { error } = await supabase.from("itens").update({ ativo: false }).eq("id", id);
  if (error) return { erro: "Não foi possível remover o item." };
  revalidatePath("/painel/itens");
  revalidatePath("/painel/lancamentos");
  return { ok: true };
}

export async function reporEstoque(id: string, quantidade: number, pago: number) {
  if (!Number.isFinite(quantidade) || quantidade === 0) return { erro: "Informe a quantidade a repor (ou tirar)." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { data: item } = await supabase.from("itens").select("estoque, nome").eq("id", id).maybeSingle();
  if (!item) return { erro: "Item não encontrado." };
  const { error } = await supabase.from("itens").update({ estoque: Math.trunc(Number(item.estoque) + quantidade) }).eq("id", id);
  if (error) return { erro: "Não foi possível atualizar o estoque." };
  if (pago > 0) {
    const { error: eDesp } = await supabase.from("lancamentos").insert({
      negocio_id: g.negocio.id, tipo: "saida", carteira: "empresa", eh_retirada: false,
      valor: pago, descricao: `Compra de estoque · ${item.nome}`, data: hojeSP(), categoria_id: null,
    });
    if (eDesp) return { erro: "Estoque atualizado, mas não foi possível lançar a despesa." };
  }
  revalidatePath("/painel/itens");
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos"); // a despesa e o novo estoque aparecem lá
  return { ok: true };
}
