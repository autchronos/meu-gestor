export type Ramo =
  | "alimentacao"
  | "beleza"
  | "revenda"
  | "servicos"
  | "locacao"
  | "outro";

const NICHO_RAMO: Record<string, Ramo> = {
  "Vendas de produtos": "revenda",
  "Alimentação": "alimentacao",
  "Aluguéis": "locacao",
  "Serviços": "servicos",
  "Outro": "outro",
};

export function nichoParaRamo(nicho: string): Ramo {
  return NICHO_RAMO[nicho] ?? "outro";
}
