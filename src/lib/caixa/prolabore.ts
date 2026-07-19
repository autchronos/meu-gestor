export interface RetiradaMin {
  data: string; // YYYY-MM-DD
  valor: number;
}

// Média por semana: soma das retiradas nos últimos 28 dias (inclui hoje) ÷ 4.
export function mediaSemanal(retiradas: RetiradaMin[], hoje: string): number {
  const [y, m, d] = hoje.split("-").map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, d - 27)).toISOString().slice(0, 10);
  const total = retiradas
    .filter((r) => r.data >= inicio && r.data <= hoje)
    .reduce((s, r) => s + r.valor, 0);
  return Math.round((total / 4) * 100) / 100;
}

export function restanteProLabore(
  limite: number,
  retirado: number,
): { restante: number; excedente: number } {
  return {
    restante: Math.max(0, limite - retirado),
    excedente: Math.max(0, retirado - limite),
  };
}
