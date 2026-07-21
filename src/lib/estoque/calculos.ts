export interface LinhaVenda { quantidade: number; preco: number }

export function totalVenda(linhas: LinhaVenda[]): number {
  return Math.round(linhas.reduce((a, l) => a + l.quantidade * l.preco, 0) * 100) / 100;
}

// Acabando = controla estoque, tem minimo definido (>0) e estoque no/abaixo dele.
export function estaAcabando(estoque: number, minimo: number, controla: boolean): boolean {
  return controla && minimo > 0 && estoque <= minimo;
}

export function descricaoItens(linhas: { quantidade: number; nome: string }[]): string {
  return linhas.map((l) => `${l.quantidade}× ${l.nome}`).join(", ");
}
