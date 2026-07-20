export interface Intervalo {
  de: string; // YYYY-MM-DD
  ate: string; // YYYY-MM-DD
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function intervaloRelatorio(periodo: string | undefined, hoje: string): Intervalo {
  const [y, m, d] = hoje.split("-").map(Number);
  if (periodo === "hoje") return { de: hoje, ate: hoje };
  if (periodo === "semana") return { de: iso(new Date(Date.UTC(y, m - 1, d - 6))), ate: hoje };
  if (periodo === "tudo") return { de: "2000-01-01", ate: hoje };
  // mês (default): 1º do mês até hoje
  return { de: `${y}-${String(m).padStart(2, "0")}-01`, ate: hoje };
}

// Janela COMPARÁVEL do mês anterior: 1º até o mesmo dia de hoje (para
// comparar mês-a-mês no mesmo trecho — parcial vs. parcial, não vs. mês cheio).
// Se hoje for dia 31 e o mês anterior tiver menos dias, trava no último dia dele.
export function mesAnterior(hoje: string): Intervalo {
  const [y, m, d] = hoje.split("-").map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const ultimo = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const dia = Math.min(d, ultimo);
  const mm = String(pm).padStart(2, "0");
  return { de: `${py}-${mm}-01`, ate: `${py}-${mm}-${String(dia).padStart(2, "0")}` };
}

export function margemPct(faturamento: number, custos: number): number {
  if (faturamento <= 0) return 0;
  return Math.round(((faturamento - custos) / faturamento) * 1000) / 10;
}

export function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

export function progressoMeta(atual: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((atual / meta) * 100)));
}
