export type TipoUI = "entrada" | "saida" | "retirada";
export type Carteira = "empresa" | "pessoal";

export interface LancamentoResolvido {
  tipo: "entrada" | "saida";
  carteira: Carteira;
  eh_retirada: boolean;
}

export function resolverLancamento(tipoUI: TipoUI, carteira: Carteira): LancamentoResolvido {
  if (tipoUI === "retirada") {
    return { tipo: "saida", carteira: "empresa", eh_retirada: true };
  }
  return { tipo: tipoUI, carteira, eh_retirada: false };
}
