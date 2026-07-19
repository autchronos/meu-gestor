"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export async function criarCategoria(nome: string, tipo: "entrada" | "saida") {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { erro: "Informe o nome." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("categorias").insert({ negocio_id: negocio.id, nome: nomeLimpo, tipo });
  if (error) {
    return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome e tipo." : "Não foi possível criar." };
  }
  revalidatePath("/painel/categorias");
  return { ok: true };
}

export async function excluirCategoria(id: string) {
  const supabase = criarClienteServidor();
  await supabase.from("categorias").delete().eq("id", id);
  revalidatePath("/painel/categorias");
}
