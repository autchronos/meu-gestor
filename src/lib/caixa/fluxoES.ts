export interface LancDia {
  data: string; // YYYY-MM-DD
  tipo: "entrada" | "saida";
  valor: number;
}
export interface PontoES {
  dia: string; // DD/MM
  entrada: number;
  saida: number;
}

export function serieEntradaSaida(lancs: LancDia[], hoje: Date): PontoES[] {
  const dias: { iso: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dias.push({ iso: `${d.getFullYear()}-${mm}-${dd}`, label: `${dd}/${mm}` });
  }
  const ini = dias[0].iso;
  const fim = dias[dias.length - 1].iso;
  const mE = new Map<string, number>();
  const mS = new Map<string, number>();
  for (const l of lancs) {
    if (l.data < ini || l.data > fim) continue;
    const m = l.tipo === "entrada" ? mE : mS;
    m.set(l.data, (m.get(l.data) ?? 0) + l.valor);
  }
  return dias.map(({ iso, label }) => ({
    dia: label,
    entrada: mE.get(iso) ?? 0,
    saida: mS.get(iso) ?? 0,
  }));
}
