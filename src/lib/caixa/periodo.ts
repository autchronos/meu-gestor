// Datas no fuso America/Sao_Paulo, independentes do timezone do servidor (a
// Vercel roda em UTC). Um "hoje" em UTC desloca o filtro de mês e a data padrão
// do formulário para o dia seguinte no fim da noite no Brasil.
export function hojeSP(): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export interface Intervalo {
  de: string;
  ate: string;
}

// `hoje` no formato YYYY-MM-DD. Devolve limites (inclusive) também YYYY-MM-DD,
// comparáveis direto com a coluna DATE do Postgres. `null` = sem filtro (tudo).
export function intervaloPeriodo(periodo: string | undefined, hoje: string): Intervalo | null {
  const [y, m, d] = hoje.split("-").map(Number); // m = 1..12
  const fmt = (yy: number, mm: number, dd: number) =>
    `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const ultimoDia = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();

  if (periodo === "mes_passado") {
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return { de: fmt(py, pm, 1), ate: fmt(py, pm, ultimoDia(py, pm)) };
  }
  if (periodo === "ultimos_30") {
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() - 29);
    return { de: base.toISOString().slice(0, 10), ate: hoje };
  }
  if (periodo === "tudo") return null;
  return { de: fmt(y, m, 1), ate: fmt(y, m, ultimoDia(y, m)) }; // mês atual (default)
}
