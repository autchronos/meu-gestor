export type Comando =
  | { tipo: "entrada"; valor: number; descricao: string }
  | { tipo: "saida"; valor: number; descricao: string }
  | { tipo: "consulta_saldo" }
  | { tipo: "consulta_estoque"; filtro: string | null }
  | { tipo: "verificacao"; codigo: string }
  | { tipo: "ajuda" };

const AJUDA: Comando = { tipo: "ajuda" };

// Aceita "50", "50,50", "R$ 15,90", "1.234,56". Ponto sozinho = decimal.
export function parseValor(s: string): number {
  let t = s.replace(/r\$/i, "").replace(/\s/g, "");
  if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  if (!/^\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

// Extrai o número no início do resto e o que sobra vira descrição.
function valorEDescricao(resto: string): { valor: number; descricao: string } | null {
  const m = resto.match(/^\s*(r\$)?\s*([\d.,]+)\s*([\s\S]*)$/i);
  if (!m) return null;
  const valor = parseValor(m[2]);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return { valor, descricao: m[3].trim() };
}

export function interpretar(texto: string): Comando {
  const t = (texto ?? "").trim();
  const lower = t.toLowerCase();

  const mVerif = t.match(/^autchronos\s+(\d{4,6})$/i);
  if (mVerif) return { tipo: "verificacao", codigo: mVerif[1] };

  if (lower === "saldo" || lower === "resumo" || lower === "hoje") return { tipo: "consulta_saldo" };

  const mEstoque = lower.match(/^estoque(?:\s+([\s\S]+))?$/);
  if (mEstoque) return { tipo: "consulta_estoque", filtro: mEstoque[1]?.trim() || null };

  if (lower === "ajuda" || lower === "menu") return AJUDA;

  // Entrada/saída por símbolo.
  if (t.startsWith("+") || t.startsWith("-")) {
    const vd = valorEDescricao(t.slice(1));
    if (!vd) return AJUDA;
    return { tipo: t.startsWith("+") ? "entrada" : "saida", valor: vd.valor, descricao: vd.descricao };
  }

  // Entrada/saída por extenso.
  const mPalavra = lower.match(/^(entrada|sa[ií]da)\b/);
  if (mPalavra) {
    const vd = valorEDescricao(t.slice(mPalavra[0].length));
    if (!vd) return AJUDA;
    return { tipo: mPalavra[1].startsWith("entrada") ? "entrada" : "saida", valor: vd.valor, descricao: vd.descricao };
  }

  return AJUDA;
}
