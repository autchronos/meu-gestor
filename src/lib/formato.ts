// Intl insere um espaço NBSP (U+00A0) entre "R$" e o número; normalizamos para
// espaço comum para que a UI e os testes sejam previsíveis.
export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(valor)
    .replace(/\u00A0/g, " ");
}

// Interpreta um valor digitado no formato brasileiro ("1.234,56") como n\u00FAmero:
// remove os pontos de milhar e troca a v\u00EDrgula decimal por ponto. Entrada
// inv\u00E1lida ou n\u00E3o positiva vira 0.
export function parseValorBRL(texto: string): number {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
