export function disponivelAluguel(estoque: number, reservado: number): number {
  return estoque - reservado;
}

// Atrasada = ainda na rua (sem devolvido_em) e a devolucao prevista ja passou.
export function estaAtrasada(devolucaoPrevista: string, devolvidoEm: string | null, hoje: string): boolean {
  return !devolvidoEm && devolucaoPrevista < hoje;
}
