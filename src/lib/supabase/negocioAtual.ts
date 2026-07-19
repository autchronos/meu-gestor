import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export interface NegocioAtual {
  id: string;
  nome: string;
  usa_estoque: boolean;
  usa_fiado: boolean;
  usa_locacao: boolean;
  usa_carteiras: boolean;
  usa_metas: boolean;
}

// cache() dedupe a consulta dentro do mesmo request (layout + page chamam juntos).
export const negocioAtual = cache(async (): Promise<NegocioAtual | null> => {
  const supabase = criarClienteServidor();
  const { data } = await supabase
    .from("negocios")
    .select("id, nome, usa_estoque, usa_fiado, usa_locacao, usa_carteiras, usa_metas")
    .limit(1)
    .maybeSingle();
  return data ?? null;
});
