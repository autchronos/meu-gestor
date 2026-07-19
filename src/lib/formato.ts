// Intl insere um espaço NBSP (U+00A0) entre "R$" e o número; normalizamos para
// espaço comum para que a UI e os testes sejam previsíveis.
export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(valor)
    .replace(/ /g, " ");
}
