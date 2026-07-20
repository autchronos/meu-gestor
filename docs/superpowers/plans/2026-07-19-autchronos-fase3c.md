# Autchronos Fase 3C (Relatório) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela de Relatório: metas do mês (com definir + comparativo mês a mês), cards de métrica por período (Faturamento/Custos/Lucro/Margem), a receber, e exportação CSV — no visual institucional.

**Architecture:** RPC `relatorio(negocio, de, ate)` (migration `0008`) para os agregados por intervalo; a página chama-a para o período do filtro + mês atual + mês anterior. Lógica pura (intervalos, margem, variação, progresso) em `src/lib/relatorio/calculos.ts`, testada. CSV via Route Handler.

**Tech Stack:** Next.js 14 · TS · Tailwind · Supabase · Vitest.

## Global Constraints

- **pt-BR**; **R$** (`formatarBRL`/`parseValorBRL`). Visual institucional: cards quadrados `border border-borda bg-superficie`, `rule`, títulos `font-serif`, labels UPPERCASE, `tabular-nums`, barras `bg-dourado`.
- **Regra de cor:** dinheiro em `entrada`/`saida`; navy nunca em valor de dinheiro (margem é percentual, não dinheiro → pode ser neutro `text-texto`).
- **Lucro = Faturamento − Custos** (de caixa); **Custos = saídas não-retirada**; **comparativo = mês atual vs mês anterior (fixo)**; cards de métrica seguem o filtro.
- **Isolamento:** `negocioAtual()` no servidor, `.eq("negocio_id", …)` + RLS; RPC com `e_membro`.
- **Migration `0008` aplicada no Cloud** (SQL Editor) como as anteriores.
- **Datas em fuso America/Sao_Paulo** (`hojeSP`). Alias `@/*` → `src/`. Build pode travar no 1º run (`0xC0000409`) / erro de `.next` no OneDrive → `rm -rf .next` e rebuildar. `npm test` verde antes de commit.

---

### Task 1: Migration 0008 (RPC relatorio) + `calculos.ts` (puro)

**Files:**
- Create: `supabase/migrations/0008_rpc_relatorio.sql`, `src/lib/relatorio/calculos.ts`
- Modify: `scripts/verificar-resumo.mjs`
- Test: `tests/calculos.test.ts`

**Interfaces:**
- Produces: RPC `relatorio(p_negocio_id uuid, p_de date, p_ate date) RETURNS jsonb` (`{faturamento, custos}`); `intervaloRelatorio`, `mesAnterior`, `margemPct`, `variacaoPct`, `progressoMeta`.

**Nota:** o apply da 0008 + verificação de banco ficam com o controlador (não rodar os scripts de banco no subagente).

- [ ] **Step 1: Teste de `calculos.ts` (falha primeiro)**

Create `tests/calculos.test.ts`:
```ts
import {
  intervaloRelatorio, mesAnterior, margemPct, variacaoPct, progressoMeta,
} from "@/lib/relatorio/calculos";

test("intervaloRelatorio: hoje/semana/mes/tudo", () => {
  expect(intervaloRelatorio("hoje", "2026-07-19")).toEqual({ de: "2026-07-19", ate: "2026-07-19" });
  expect(intervaloRelatorio("semana", "2026-07-19")).toEqual({ de: "2026-07-13", ate: "2026-07-19" });
  expect(intervaloRelatorio("mes", "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-19" });
  expect(intervaloRelatorio(undefined, "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-19" });
  expect(intervaloRelatorio("tudo", "2026-07-19")).toEqual({ de: "2000-01-01", ate: "2026-07-19" });
});

test("mesAnterior atravessa a virada do ano", () => {
  expect(mesAnterior("2026-01-10")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
});

test("margemPct", () => {
  expect(margemPct(1000, 400)).toBe(60);
  expect(margemPct(0, 0)).toBe(0);
});

test("variacaoPct (anterior 0 -> null)", () => {
  expect(variacaoPct(120, 100)).toBe(20);
  expect(variacaoPct(80, 100)).toBe(-20);
  expect(variacaoPct(50, 0)).toBeNull();
});

test("progressoMeta", () => {
  expect(progressoMeta(555, 3000)).toBe(19);
  expect(progressoMeta(5000, 3000)).toBe(100);
  expect(progressoMeta(100, 0)).toBe(0);
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- calculos`
Expected: FAIL "Cannot find module '@/lib/relatorio/calculos'".

- [ ] **Step 3: Implementar `calculos.ts`**

Create `src/lib/relatorio/calculos.ts`:
```ts
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

export function mesAnterior(hoje: string): Intervalo {
  const [y, m] = hoje.split("-").map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const ultimo = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const mm = String(pm).padStart(2, "0");
  return { de: `${py}-${mm}-01`, ate: `${py}-${mm}-${String(ultimo).padStart(2, "0")}` };
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
  return Math.min(100, Math.round((atual / meta) * 100));
}
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- calculos`
Expected: PASS (5 testes).

- [ ] **Step 5: Criar a migration 0008**

Create `supabase/migrations/0008_rpc_relatorio.sql`:
```sql
-- ============================================================
-- Relatorio: faturamento (entradas) e custos (saidas nao-retirada) por intervalo.
-- ============================================================
CREATE OR REPLACE FUNCTION relatorio(p_negocio_id UUID, p_de DATE, p_ate DATE)
RETURNS JSONB AS $$
BEGIN
  IF NOT e_membro(p_negocio_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  RETURN jsonb_build_object(
    'faturamento', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa' AND tipo = 'entrada'
        AND data >= p_de AND data <= p_ate), 0),
    'custos', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa' AND tipo = 'saida'
        AND NOT eh_retirada AND data >= p_de AND data <= p_ate), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION relatorio(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION relatorio(UUID, DATE, DATE) TO authenticated;
```

- [ ] **Step 6: Estender `verificar-resumo.mjs`**

Modify `scripts/verificar-resumo.mjs` — antes de `await admin.from("negocios").delete()...`, insira:
```js
// Fase 3C: relatorio (faturamento = entradas; custos = saidas nao-retirada).
const { error: eDesp } = await cli.from("lancamentos").insert({
  negocio_id: negId, tipo: "saida", descricao: "despesa", valor: 50, carteira: "empresa", eh_retirada: false,
});
assert(!eDesp, "inseriu a despesa de teste");
const hojeIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const { data: rel, error: eRel } = await cli.rpc("relatorio", { p_negocio_id: negId, p_de: "2000-01-01", p_ate: hojeIso });
assert(!eRel, "relatorio executa");
assert(Number(rel.faturamento) === 300, `faturamento = 300 (veio ${rel?.faturamento})`);
assert(Number(rel.custos) === 50, `custos = 50 (retirada fora; veio ${rel?.custos})`);
```

- [ ] **Step 7: Rodar suíte e commit** (apply + scripts de banco ficam com o controlador)

Run: `npm test` → verde.

```bash
git add supabase/migrations/0008_rpc_relatorio.sql src/lib/relatorio/calculos.ts scripts/verificar-resumo.mjs tests/calculos.test.ts
git commit -m "feat: migration 0008 (RPC relatorio) e calculos do relatorio"
```

---

### Task 2: Tela de Relatório + metas + CSV

**Files:**
- Modify: `src/app/painel/relatorios/page.tsx` (substitui o stub)
- Create: `src/app/painel/relatorios/acoes.ts`, `src/app/painel/relatorios/FormMetas.tsx`, `src/app/painel/relatorios/csv/route.ts`

**Interfaces:**
- Consumes: RPC `relatorio` (Task 1), `intervaloRelatorio`/`mesAnterior`/`margemPct`/`variacaoPct`/`progressoMeta`, `hojeSP`, `formatarBRL`/`parseValorBRL`, `negocioAtual`.
- Produces: server action `salvarMetas`; Route Handler `GET /painel/relatorios/csv`.

- [ ] **Step 1: Server action de metas**

Create `src/app/painel/relatorios/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export async function salvarMetas(faturamento: number, lucro: number) {
  if (faturamento < 0 || lucro < 0) return { erro: "As metas não podem ser negativas." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase
    .from("metas")
    .update({ meta_faturamento: faturamento, meta_lucro: lucro })
    .eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível salvar as metas." };
  revalidatePath("/painel/relatorios");
  return { ok: true };
}
```

- [ ] **Step 2: Form de metas (client)**

Create `src/app/painel/relatorios/FormMetas.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarMetas } from "@/app/painel/relatorios/acoes";
import { parseValorBRL } from "@/lib/formato";

export function FormMetas({ faturamentoAtual, lucroAtual }: { faturamentoAtual: number; lucroAtual: number }) {
  const [fat, setFat] = useState(faturamentoAtual > 0 ? String(faturamentoAtual).replace(".", ",") : "");
  const [luc, setLuc] = useState(lucroAtual > 0 ? String(lucroAtual).replace(".", ",") : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarMetas(parseValorBRL(fat), parseValorBRL(luc));
      setMsg(r?.erro ?? "Metas salvas!");
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Definir metas do mês</p>
      <label className="flex flex-col gap-1 text-sm">Meta de faturamento
        <input value={fat} onChange={(e) => setFat(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Meta de lucro
        <input value={luc} onChange={(e) => setLuc(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar metas"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Route Handler do CSV**

Create `src/app/painel/relatorios/csv/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const de = searchParams.get("de") ?? "2000-01-01";
  const ate = searchParams.get("ate") ?? "2100-01-01";

  const negocio = await negocioAtual();
  if (!negocio) return new NextResponse("Não autorizado", { status: 401 });

  const supabase = criarClienteServidor();
  const { data } = await supabase
    .from("lancamentos")
    .select("data, descricao, tipo, valor, eh_retirada")
    .eq("negocio_id", negocio.id)
    .gte("data", de).lte("data", ate)
    .order("data", { ascending: false });

  const linhas = [["data", "descricao", "tipo", "valor"]];
  for (const l of data ?? []) {
    const tipo = l.eh_retirada ? "retirada" : l.tipo;
    const desc = `"${String(l.descricao).replace(/"/g, '""')}"`;
    linhas.push([l.data, desc, tipo, String(l.valor)]);
  }
  // BOM + separador ';' para o Excel PT-BR abrir bem.
  const csv = "﻿" + linhas.map((r) => r.join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${de}-a-${ate}.csv"`,
    },
  });
}
```

- [ ] **Step 4: Página do Relatório (substitui o stub)**

Modify `src/app/painel/relatorios/page.tsx` — substitua o arquivo inteiro por:
```tsx
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { intervaloRelatorio, mesAnterior, margemPct, variacaoPct, progressoMeta, type Intervalo } from "@/lib/relatorio/calculos";
import { formatarBRL } from "@/lib/formato";
import { FormMetas } from "@/app/painel/relatorios/FormMetas";

const PERIODOS = [
  { v: "hoje", r: "Hoje" }, { v: "semana", r: "Semana" }, { v: "mes", r: "Mês" }, { v: "tudo", r: "Tudo" },
];

export default async function Relatorios({ searchParams }: { searchParams: { periodo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const hoje = hojeSP();
  const periodo = searchParams.periodo ?? "mes";

  const sel = intervaloRelatorio(periodo, hoje);
  const mesAt = intervaloRelatorio("mes", hoje);
  const mesAnt = mesAnterior(hoje);

  const rpc = (i: Intervalo) => supabase.rpc("relatorio", { p_negocio_id: negocio.id, p_de: i.de, p_ate: i.ate });
  const [selR, mesR, antR, metasR, receberR] = await Promise.all([
    rpc(sel), rpc(mesAt), rpc(mesAnt),
    supabase.from("metas").select("meta_faturamento, meta_lucro").eq("negocio_id", negocio.id).maybeSingle(),
    supabase.from("receber").select("valor").eq("negocio_id", negocio.id).eq("pago", false),
  ]);

  const dados = (d: unknown) => {
    const o = (d ?? {}) as { faturamento?: number; custos?: number };
    return { faturamento: Number(o.faturamento ?? 0), custos: Number(o.custos ?? 0) };
  };
  const selD = dados(selR.data), mesD = dados(mesR.data), antD = dados(antR.data);
  const metaFat = Number(metasR.data?.meta_faturamento ?? 0);
  const metaLuc = Number(metasR.data?.meta_lucro ?? 0);
  const aReceber = (receberR.data ?? []).reduce((a, x) => a + Number(x.valor), 0);

  const lucroMes = mesD.faturamento - mesD.custos;
  const lucroSel = selD.faturamento - selD.custos;
  const varFat = variacaoPct(mesD.faturamento, antD.faturamento);
  const varLuc = variacaoPct(lucroMes, antD.faturamento - antD.custos);

  return (
    <>
      <div className="bg-marca text-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="font-serif text-2xl">Relatório</h1>
          <p className="mt-1 text-xs text-white/60">Lucro = entradas − despesas do período (não inclui custo de estoque).</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="border border-borda bg-superficie p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-marca">Metas do mês</p>
          <Meta label="Faturamento" atual={mesD.faturamento} meta={metaFat} variacao={varFat} />
          <Meta label="Lucro" atual={lucroMes} meta={metaLuc} variacao={varLuc} />
        </div>

        <form method="get" className="flex border border-borda text-[11px] uppercase tracking-wider">
          {PERIODOS.map((p) => (
            <button key={p.v} name="periodo" value={p.v} type="submit"
              className={`flex-1 px-2 py-2 transition-colors ${periodo === p.v ? "bg-marca text-white" : "text-texto-suave hover:text-texto"}`}>
              {p.r}
            </button>
          ))}
        </form>

        <div className="grid grid-cols-2 gap-3">
          <Card label="Faturamento" valor={formatarBRL(selD.faturamento)} cor="text-entrada" />
          <Card label="Custos" valor={formatarBRL(selD.custos)} cor="text-saida" />
          <Card label="Lucro" valor={formatarBRL(lucroSel)} cor={lucroSel >= 0 ? "text-entrada" : "text-saida"} />
          <Card label="Margem" valor={`${margemPct(selD.faturamento, selD.custos)}%`} cor="text-texto" />
        </div>

        <div className="border border-borda bg-superficie p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">A receber</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-texto">{formatarBRL(aReceber)}</p>
        </div>

        <a href={`/painel/relatorios/csv?de=${sel.de}&ate=${sel.ate}`}
          className="border border-marca px-4 py-2 text-center text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
          Exportar CSV
        </a>

        <FormMetas faturamentoAtual={metaFat} lucroAtual={metaLuc} />
      </div>
    </>
  );
}

function Meta({ label, atual, meta, variacao }: { label: string; atual: number; meta: number; variacao: number | null }) {
  const pct = progressoMeta(atual, meta);
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-texto">{label}</span>
        <span className="tabular-nums text-texto-suave">{formatarBRL(atual)} / {formatarBRL(meta)} <span className="text-marca">({pct}%)</span></span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden bg-borda"><div className="h-full bg-dourado" style={{ width: `${pct}%` }} /></div>
      {variacao !== null && (
        <p className="mt-1 text-xs text-texto-suave">vs. mês passado: <span className={variacao >= 0 ? "text-entrada" : "text-saida"}>{variacao >= 0 ? "↑" : "↓"} {Math.abs(variacao)}%</span></p>
      )}
    </div>
  );
}

function Card({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="border border-borda bg-superficie p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}
```

- [ ] **Step 5: Build, testes e commit**

Run: `npm run build` (retry / `rm -rf .next` se necessário) e `npm test` → verdes.

Verificação manual (não bloqueia): `npm run dev`, na aba Relatórios: definir metas e ver o progresso + comparativo; trocar o período e ver os cards mudarem; clicar "Exportar CSV" e conferir o arquivo.

```bash
git add src/app/painel/relatorios
git commit -m "feat: tela de Relatorio (metas, comparativo, metricas por periodo, export CSV)"
```

---

## Self-Review (cobertura da spec)

- **RPC relatorio (0008) + verificação** → Task 1. ✓
- **calculos puros (intervalos, margem, variação, progresso) testados** → Task 1. ✓
- **Metas do mês + definir + comparativo mês a mês** → Task 2 (Meta + FormMetas). ✓
- **Filtro Hoje/Semana/Mês/Tudo + cards de métrica por período** → Task 2. ✓
- **A receber** → Task 2. ✓
- **Export CSV** → Task 2 (route handler + link). ✓
- **Lucro de caixa, nota na tela, margem neutra (não money-navy)** → Task 2. ✓

Fora de escopo: unidades vendidas (Fase 5). Dependência externa: aplicar a `0008` no Cloud (Task 1).
