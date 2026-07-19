export interface LancamentoFluxo {
  data: string; // YYYY-MM-DD
  tipo: "entrada" | "saida";
  valor: number;
}
export interface PontoFluxo {
  data: string; // YYYY-MM-DD
  saldo: number;
}

const DIAS = 30;

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Reconstroi o saldo acumulado dos ultimos 30 dias terminando em `disponivelAtual`.
export function serieFluxoCaixa(
  lancamentos: LancamentoFluxo[],
  disponivelAtual: number,
  hoje: Date,
): PontoFluxo[] {
  const delta = (l: LancamentoFluxo) => (l.tipo === "entrada" ? l.valor : -l.valor);

  // dias do periodo (hoje-29 .. hoje)
  const dias: string[] = [];
  for (let i = DIAS - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    dias.push(isoLocal(d));
  }
  const primeiro = dias[0];
  const ultimo = dias[dias.length - 1];

  // Só o que cai DENTRO da janela (inclui até hoje). Lançamento com data futura
  // fica de fora da soma e da abertura, senão a série não fecharia no disponível.
  const netPorDia = new Map<string, number>();
  let netPeriodo = 0;
  for (const l of lancamentos) {
    if (l.data >= primeiro && l.data <= ultimo) {
      netPorDia.set(l.data, (netPorDia.get(l.data) ?? 0) + delta(l));
      netPeriodo += delta(l);
    }
  }

  const abertura = disponivelAtual - netPeriodo;
  let saldo = abertura;
  return dias.map((data) => {
    saldo += netPorDia.get(data) ?? 0;
    return { data, saldo: Math.round(saldo * 100) / 100 };
  });
}
