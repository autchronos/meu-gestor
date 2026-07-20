// Valor liquido que cai no caixa quando a conta e paga. MESMA conta do trigger
// sync_receber_lancamento (0005): ROUND(valor * (1 - taxa/100), 2).
export function liquido(valor: number, taxa: number): number {
  return Math.round(valor * (1 - taxa / 100) * 100) / 100;
}

// Vencida = tem vencimento no passado. Sem vencimento nunca vence.
// (Aqui e so a comparacao de datas; "aberta" e filtrado na tela.)
export function estaVencida(vencimento: string | null, hoje: string): boolean {
  return !!vencimento && vencimento < hoje;
}
