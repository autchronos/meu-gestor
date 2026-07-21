"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { resolverCliente } from "@/lib/clientes/resolver";

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_locacao) return { negocio: null, erro: "Locação está desativada nas configurações." as string };
  return { negocio, erro: "" };
}

export interface DadosLocacao {
  cliente: string; item_id: string; quantidade: number; valor: number;
  data_retirada: string; devolucao_prevista: string;
  pagamento: "recebido" | "receber" | "nenhum";
}

export async function registrarLocacao(d: DadosLocacao) {
  if (!d.cliente.trim()) return { erro: "Informe o cliente." };
  if (!d.item_id) return { erro: "Escolha um item." };
  if (!(d.quantidade > 0)) return { erro: "Informe a quantidade." }; // pega NaN também
  if (d.valor < 0) return { erro: "O valor não pode ser negativo." };
  if (!d.devolucao_prevista) return { erro: "Informe a devolução prevista." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  if (d.pagamento === "receber" && !g.negocio.usa_fiado) return { erro: "\"A receber\" exige o módulo de fiado ativo." };
  const supabase = criarClienteServidor();

  const { data: item } = await supabase
    .from("itens").select("nome").eq("id", d.item_id).eq("negocio_id", g.negocio.id).eq("tipo", "aluguel").eq("ativo", true).maybeSingle();
  if (!item) return { erro: "Item de aluguel não encontrado." };

  const clienteId = await resolverCliente(supabase, g.negocio.id, d.cliente.trim());
  if (!clienteId) return { erro: "Não foi possível salvar o cliente." };

  const { error: eLoc } = await supabase.from("locacoes").insert({
    negocio_id: g.negocio.id, item_id: d.item_id, cliente_id: clienteId,
    quantidade: Math.trunc(d.quantidade), valor: d.valor,
    data_retirada: d.data_retirada || hojeSP(), devolucao_prevista: d.devolucao_prevista,
  });
  if (eLoc) return { erro: "Não foi possível registrar a locação." };

  // A locacao ja esta gravada; se o lancamento do dinheiro falhar, avisamos
  // (nao engolir o erro num app financeiro) — mesmo padrao do reporEstoque.
  let avisoPagamento = "";
  if (d.valor > 0 && d.pagamento === "recebido") {
    const { error } = await supabase.from("lancamentos").insert({
      negocio_id: g.negocio.id, tipo: "entrada", carteira: "empresa", eh_retirada: false,
      valor: d.valor, descricao: `Aluguel · ${item.nome}`, data: d.data_retirada || hojeSP(), categoria_id: null,
    });
    if (error) avisoPagamento = "Locação registrada, mas não foi possível lançar a entrada no caixa.";
  } else if (d.valor > 0 && d.pagamento === "receber") {
    const { error } = await supabase.from("receber").insert({
      negocio_id: g.negocio.id, cliente_id: clienteId, descricao: `Aluguel · ${item.nome}`,
      valor: d.valor, vencimento: d.devolucao_prevista, taxa: 0,
    });
    if (error) avisoPagamento = "Locação registrada, mas não foi possível criar a conta a receber.";
  }
  revalidatePath("/painel/locacoes");
  revalidatePath("/painel/itens");
  revalidatePath("/painel");
  return avisoPagamento ? { erro: avisoPagamento } : { ok: true };
}

async function setDevolucao(id: string, devolvido: boolean) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("locacoes").update({ devolvido_em: devolvido ? hojeSP() : null }).eq("id", id);
  if (error) return { erro: "Não foi possível atualizar a locação." };
  revalidatePath("/painel/locacoes");
  revalidatePath("/painel/itens");
  return { ok: true };
}

export const marcarDevolucao = (id: string) => setDevolucao(id, true);

export async function excluirLocacao(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  // Nao mexe no dinheiro ja lancado (registro desacoplado).
  const { error } = await supabase.from("locacoes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir a locação." };
  revalidatePath("/painel/locacoes");
  revalidatePath("/painel/itens");
  return { ok: true };
}

export async function marcarDevolucaoForm(id: string) { await marcarDevolucao(id); }
export async function excluirLocacaoForm(id: string) { await excluirLocacao(id); }
