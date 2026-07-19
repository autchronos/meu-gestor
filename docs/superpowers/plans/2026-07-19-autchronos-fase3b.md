# Autchronos Fase 3B (Retiradas & pró-labore) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela de retiradas (pró-labore) com limite mensal, alerta visual, média semanal, histórico e registro rápido; card no dashboard — tudo gateado por `usa_carteiras`.

**Architecture:** Reaproveita `lancamentos` com `eh_retirada=true` (3A) e `metas.limite_prolabore` (0005). A RPC `resumo_dashboard` é estendida (migration `0007`) para devolver `retirado_mes` + `limite_prolabore`, mantendo o dashboard numa chamada. Lógica pura em `src/lib/caixa/prolabore.ts` (testada).

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind · `@supabase/ssr` · Supabase · Vitest.

## Global Constraints

- **pt-BR**; **R$** (`formatarBRL`/`parseValorBRL`). Design "Institucional Clássico": retiradas/excedente em `saida` (vinho), barra dentro do limite em `dourado`; a marca (navy) nunca representa dinheiro.
- **Gating por `usa_carteiras`:** a aba "Retiradas", a tela e o card do dashboard só existem se a flag estiver ligada. `registrarRetirada` também revalida a flag no servidor.
- **Retirada** = `resolverLancamento("retirada","empresa")` (do 3A): `tipo=saida`, `carteira=empresa`, `eh_retirada=true`, `categoria_id=null`.
- **`resumo_dashboard`** continua `SECURITY DEFINER` + `e_membro`, fuso America/Sao_Paulo, `data <= hoje`.
- **Isolamento:** `negocioAtual()` no servidor; queries com `.eq("negocio_id", ...)` + RLS.
- **Migration `0007` precisa ser aplicada no Cloud** (SQL Editor), como a `0006`.
- **Next 14:** `cookies()` síncrono. Alias `@/*` → `./src/*`. Build pode travar no 1º run (`0xC0000409`); rodar de novo.

---

## Estrutura de arquivos (3B)

```
supabase/migrations/0007_resumo_retiradas.sql
scripts/verificar-resumo.mjs (modificar: assert retirado_mes + limite_prolabore)
src/lib/caixa/prolabore.ts               # mediaSemanal + restanteProLabore
src/components/painel/NavInferior.tsx     (modificar: item "Retiradas" gated)
src/app/painel/layout.tsx                 (modificar: passa usaCarteiras à nav)
src/app/painel/retiradas/page.tsx
src/app/painel/retiradas/acoes.ts
src/app/painel/retiradas/FormLimite.tsx, FormRetirada.tsx
src/components/painel/CardProLabore.tsx
src/app/painel/page.tsx                   (modificar: card pró-labore gated)
tests/prolabore.test.ts
```

---

### Task 1: Migration 0007 (estende resumo_dashboard) + `prolabore.ts` (puro)

**Files:**
- Create: `supabase/migrations/0007_resumo_retiradas.sql`, `src/lib/caixa/prolabore.ts`
- Modify: `scripts/verificar-resumo.mjs`
- Test: `tests/prolabore.test.ts`

**Interfaces:**
- Produces: RPC `resumo_dashboard` também com `retirado_mes` + `limite_prolabore`; `mediaSemanal(retiradas, hoje)`, `restanteProLabore(limite, retirado)`.

**Nota:** o apply da 0007 (SQL Editor) + as verificações de banco são feitas pelo controlador com o usuário — o subagente cria os arquivos e NÃO roda os scripts de banco.

- [ ] **Step 1: Teste de `prolabore.ts` (falha primeiro)**

Create `tests/prolabore.test.ts`:
```ts
import { mediaSemanal, restanteProLabore } from "@/lib/caixa/prolabore";

const R = (data: string, valor: number) => ({ data, valor });

test("mediaSemanal soma os últimos 28 dias e divide por 4", () => {
  // hoje 2026-07-28 -> janela começa em 2026-07-01
  const m = mediaSemanal([R("2026-07-10", 100), R("2026-07-20", 300), R("2026-05-01", 999)], "2026-07-28");
  expect(m).toBe(100); // (100+300)/4; a de maio fica fora
});

test("mediaSemanal sem retiradas é 0", () => {
  expect(mediaSemanal([], "2026-07-28")).toBe(0);
});

test("restanteProLabore dentro do limite", () => {
  expect(restanteProLabore(1000, 300)).toEqual({ restante: 700, excedente: 0 });
});

test("restanteProLabore ultrapassado", () => {
  expect(restanteProLabore(1000, 1200)).toEqual({ restante: 0, excedente: 200 });
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- prolabore`
Expected: FAIL "Cannot find module '@/lib/caixa/prolabore'".

- [ ] **Step 3: Implementar `prolabore.ts`**

Create `src/lib/caixa/prolabore.ts`:
```ts
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
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- prolabore`
Expected: PASS (4 testes).

- [ ] **Step 5: Criar a migration 0007**

Create `supabase/migrations/0007_resumo_retiradas.sql`:
```sql
-- ============================================================
-- Estende resumo_dashboard com retirado_mes + limite_prolabore (Fase 3B).
-- ============================================================
CREATE OR REPLACE FUNCTION resumo_dashboard(p_negocio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_hoje    DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_ini_mes DATE := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
  IF NOT e_membro(p_negocio_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  RETURN jsonb_build_object(
    'disponivel', COALESCE((
      SELECT SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END)
      FROM lancamentos WHERE negocio_id = p_negocio_id AND carteira = 'empresa'), 0),
    'a_receber', COALESCE((
      SELECT SUM(valor) FROM receber
      WHERE negocio_id = p_negocio_id AND NOT pago), 0),
    'entradas_mes', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa'
        AND tipo = 'entrada' AND data >= v_ini_mes AND data <= v_hoje), 0),
    'saidas_mes', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa'
        AND tipo = 'saida' AND NOT eh_retirada AND data >= v_ini_mes AND data <= v_hoje), 0),
    'retirado_mes', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa'
        AND eh_retirada AND data >= v_ini_mes AND data <= v_hoje), 0),
    'limite_prolabore', COALESCE((
      SELECT limite_prolabore FROM metas WHERE negocio_id = p_negocio_id), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
```

- [ ] **Step 6: Estender `verificar-resumo.mjs`**

Modify `scripts/verificar-resumo.mjs` — antes da linha `await admin.from("negocios").delete()...`, insira:
```js
// Fase 3B: retirado_mes reflete a retirada (100); apos definir limite, retorna 300.
assert(Number(resumo.retirado_mes) === 100, `retirado_mes = 100 (veio ${resumo?.retirado_mes})`);
await cli.from("metas").update({ limite_prolabore: 300 }).eq("negocio_id", negId);
const { data: resumo2 } = await cli.rpc("resumo_dashboard", { p_negocio_id: negId });
assert(Number(resumo2.limite_prolabore) === 300, `limite_prolabore = 300 (veio ${resumo2?.limite_prolabore})`);
```

- [ ] **Step 7: Rodar suíte e commit** (o apply da 0007 + os scripts de banco ficam com o controlador)

Run: `npm test` → todos verdes.

```bash
git add supabase/migrations/0007_resumo_retiradas.sql src/lib/caixa/prolabore.ts scripts/verificar-resumo.mjs tests/prolabore.test.ts
git commit -m "feat: migration 0007 (resumo com retirado_mes/limite) e prolabore.ts"
```

---

### Task 2: Aba Retiradas gated + tela + ações

**Files:**
- Modify: `src/components/painel/NavInferior.tsx`, `src/app/painel/layout.tsx`
- Create: `src/app/painel/retiradas/page.tsx`, `src/app/painel/retiradas/acoes.ts`, `src/app/painel/retiradas/FormLimite.tsx`, `src/app/painel/retiradas/FormRetirada.tsx`

**Interfaces:**
- Consumes: `negocioAtual`, `criarClienteServidor`, `resolverLancamento` (3A), `hojeSP` (3A), `mediaSemanal`/`restanteProLabore` (Task 1), `formatarBRL`/`parseValorBRL`.
- Produces: rota `/painel/retiradas` (gated); server actions `definirLimite`, `registrarRetirada`.

- [ ] **Step 1: Nav gated — `NavInferior` recebe `usaCarteiras`**

Modify `src/components/painel/NavInferior.tsx` — substitua o arquivo inteiro por:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavInferior({ usaCarteiras }: { usaCarteiras: boolean }) {
  const path = usePathname();
  const itens = [
    { href: "/painel", rotulo: "Início" },
    { href: "/painel/lancamentos", rotulo: "Lançamentos" },
    ...(usaCarteiras ? [{ href: "/painel/retiradas", rotulo: "Retiradas" }] : []),
    { href: "/painel/categorias", rotulo: "Categorias" },
    { href: "/painel/configuracoes", rotulo: "Config" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-superficie">
      <div className="mx-auto flex max-w-2xl">
        {itens.map((i) => {
          const ativo = i.href === "/painel"
            ? path === "/painel"
            : path === i.href || path.startsWith(`${i.href}/`);
          return (
            <Link key={i.href} href={i.href} aria-current={ativo ? "page" : undefined}
              className={`flex-1 py-3 text-center text-xs ${ativo ? "font-semibold text-marca" : "text-texto-suave"}`}>
              {i.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Layout passa a flag para a nav**

Modify `src/app/painel/layout.tsx` — troque `<NavInferior />` por:
```tsx
      <NavInferior usaCarteiras={negocio.usa_carteiras} />
```

- [ ] **Step 3: Server actions**

Create `src/app/painel/retiradas/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { resolverLancamento } from "@/lib/caixa/lancamento";

export async function definirLimite(valor: number) {
  if (valor < 0) return { erro: "O limite não pode ser negativo." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("metas").update({ limite_prolabore: valor }).eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível salvar o limite." };
  revalidatePath("/painel");
  revalidatePath("/painel/retiradas");
  return { ok: true };
}

export async function registrarRetirada(valor: number, descricao: string) {
  if (valor <= 0) return { erro: "Informe um valor maior que zero." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  if (!negocio.usa_carteiras) return { erro: "Retiradas estão desativadas." };
  const supabase = criarClienteServidor();
  const r = resolverLancamento("retirada", "empresa");
  const { error } = await supabase.from("lancamentos").insert({
    negocio_id: negocio.id,
    tipo: r.tipo,
    carteira: r.carteira,
    eh_retirada: r.eh_retirada,
    valor,
    descricao: descricao.trim() || "Retirada",
    data: hojeSP(),
    categoria_id: null,
  });
  if (error) return { erro: "Não foi possível registrar a retirada." };
  revalidatePath("/painel");
  revalidatePath("/painel/retiradas");
  return { ok: true };
}
```

- [ ] **Step 4: `FormLimite`**

Create `src/app/painel/retiradas/FormLimite.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { definirLimite } from "@/app/painel/retiradas/acoes";
import { parseValorBRL } from "@/lib/formato";

export function FormLimite({ limiteAtual }: { limiteAtual: number }) {
  const [valor, setValor] = useState(limiteAtual > 0 ? String(limiteAtual).replace(".", ",") : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await definirLimite(parseValorBRL(valor));
      setMsg(r?.erro ?? "Limite salvo!");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold text-texto">Limite de pró-labore (por mês)</p>
      <div className="flex gap-2">
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00"
          className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto" />
        <button type="button" onClick={salvar} disabled={pendente}
          className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pendente ? "..." : "Salvar"}
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 5: `FormRetirada`**

Create `src/app/painel/retiradas/FormRetirada.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { registrarRetirada } from "@/app/painel/retiradas/acoes";
import { parseValorBRL } from "@/lib/formato";

export function FormRetirada() {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function registrar() {
    setErro(null);
    iniciar(async () => {
      const r = await registrarRetirada(parseValorBRL(valor), descricao);
      if (r?.erro) { setErro(r.erro); return; }
      setValor(""); setDescricao("");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold text-texto">Registrar retirada</p>
      <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor (0,00)" className={campo} />
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className={campo} />
      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      <button type="button" onClick={registrar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Registrando..." : "Registrar retirada"}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Página `/painel/retiradas`**

Create `src/app/painel/retiradas/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { mediaSemanal, restanteProLabore } from "@/lib/caixa/prolabore";
import { formatarBRL } from "@/lib/formato";
import { FormLimite } from "@/app/painel/retiradas/FormLimite";
import { FormRetirada } from "@/app/painel/retiradas/FormRetirada";

export default async function Retiradas() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_carteiras) redirect("/painel");
  const supabase = criarClienteServidor();

  const { data: resumo } = await supabase.rpc("resumo_dashboard", { p_negocio_id: negocio.id });
  const retiradoMes = Number(resumo?.retirado_mes ?? 0);
  const limite = Number(resumo?.limite_prolabore ?? 0);

  const { data: retiradas } = await supabase
    .from("lancamentos")
    .select("id, descricao, valor, data")
    .eq("negocio_id", negocio.id).eq("eh_retirada", true)
    .order("data", { ascending: false }).limit(50);
  const lista = (retiradas ?? []).map((r) => ({ ...r, valor: Number(r.valor) }));

  const media = mediaSemanal(lista.map((r) => ({ data: r.data, valor: r.valor })), hojeSP());
  const { restante, excedente } = restanteProLabore(limite, retiradoMes);
  const pct = limite > 0 ? Math.min(100, Math.round((retiradoMes / limite) * 100)) : 0;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Retiradas (pró-labore)</h1>

      <div className="rounded-xl border border-borda bg-superficie p-4">
        <p className="text-sm text-texto-suave">Retirado no mês</p>
        <p className="font-serif text-2xl font-bold text-saida">{formatarBRL(retiradoMes)}</p>
        {limite > 0 ? (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-borda">
              <div className={`h-full ${excedente > 0 ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-texto-suave">
              {excedente > 0
                ? <>Você passou <span className="font-semibold text-saida">{formatarBRL(excedente)}</span> do limite de {formatarBRL(limite)}.</>
                : <>Restam <span className="font-semibold text-entrada">{formatarBRL(restante)}</span> de {formatarBRL(limite)} este mês.</>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-texto-suave">Defina um limite de pró-labore abaixo.</p>
        )}
        <p className="mt-2 text-sm text-texto-suave">Média semanal: {formatarBRL(media)}</p>
      </div>

      <FormLimite limiteAtual={limite} />
      <FormRetirada />

      <div className="rounded-xl border border-borda bg-superficie">
        <p className="border-b border-borda px-4 py-2 text-sm font-semibold text-texto">Histórico</p>
        <ul className="divide-y divide-borda">
          {lista.map((r) => (
            <li key={r.id} className="flex justify-between px-4 py-2 text-sm">
              <span className="text-texto">
                {r.descricao}
                <span className="text-xs text-texto-suave"> · {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
              </span>
              <span className="text-saida">-{formatarBRL(r.valor)}</span>
            </li>
          ))}
          {lista.length === 0 && <li className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma retirada ainda.</li>}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

```bash
git add src/components/painel/NavInferior.tsx src/app/painel/layout.tsx src/app/painel/retiradas
git commit -m "feat: aba Retiradas gated + tela de pro-labore (limite, media, registrar, historico)"
```

---

### Task 3: Card de pró-labore no dashboard

**Files:**
- Create: `src/components/painel/CardProLabore.tsx`
- Modify: `src/app/painel/page.tsx`

**Interfaces:**
- Consumes: `retirado_mes` + `limite_prolabore` da RPC (Task 1).

- [ ] **Step 1: `CardProLabore`**

Create `src/components/painel/CardProLabore.tsx`:
```tsx
import { formatarBRL } from "@/lib/formato";

export function CardProLabore({ retirado, limite }: { retirado: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((retirado / limite) * 100)) : 0;
  const passou = retirado > limite;
  return (
    <div className="rounded-xl border border-borda bg-superficie p-4">
      <p className="text-sm text-texto-suave">Pró-labore este mês</p>
      <p className="text-texto">
        Você já retirou <span className="font-semibold text-saida">{formatarBRL(retirado)}</span> de {formatarBRL(limite)}.
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-borda">
        <div className={`h-full ${passou ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
      </div>
      {passou && <p className="mt-1 text-xs text-saida">Você ultrapassou o limite de pró-labore.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Wire no dashboard**

Modify `src/app/painel/page.tsx`:

Adicione o import:
```tsx
import { CardProLabore } from "@/components/painel/CardProLabore";
```

Estenda o objeto default do resumo (para o caso raro de a RPC falhar) — troque a linha
`const r = resumo ?? { disponivel: 0, a_receber: 0, entradas_mes: 0, saidas_mes: 0 };` por:
```tsx
  const r = resumo ?? { disponivel: 0, a_receber: 0, entradas_mes: 0, saidas_mes: 0, retirado_mes: 0, limite_prolabore: 0 };
```

E, dentro do `<section>`, logo após `<CardsSaldo ... />`, insira:
```tsx
      {negocio.usa_carteiras && Number(r.limite_prolabore) > 0 && (
        <CardProLabore retirado={Number(r.retirado_mes)} limite={Number(r.limite_prolabore)} />
      )}
```

- [ ] **Step 3: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

Verificação manual (não bloqueia commit): `npm run dev`, na tela Retiradas definir um limite e registrar uma retirada; ver o card no dashboard e a barra; ultrapassar o limite e ver o alerta vinho; desligar `usa_carteiras` em Configurações e confirmar que a aba e o card somem.

```bash
git add src/components/painel/CardProLabore.tsx src/app/painel/page.tsx
git commit -m "feat: card de pro-labore no dashboard (retirado x limite)"
```

---

## Self-Review (cobertura da spec)

- **Migration 0007 (resumo com retirado_mes + limite_prolabore)** → Task 1. ✓
- **mediaSemanal + restanteProLabore (puros, testados)** → Task 1. ✓
- **Aba Retiradas gated por usa_carteiras** → Task 2 (NavInferior + layout). ✓
- **Tela: total do mês, média semanal, limite (definir), quanto resta, alerta, histórico, registrar retirada** → Task 2. ✓
- **Card no dashboard (gated por usa_carteiras + limite>0)** → Task 3. ✓
- **Gating server-side na registrarRetirada** → Task 2 (acoes). ✓
- **Cores: retirada/excedente em saida, barra dentro em dourado; marca nunca em dinheiro** → Task 2/3. ✓

Fora de escopo (correto): alerta por WhatsApp (Fase 6), relatórios/CSV (3C), a-receber (Fase 4), estoque (Fase 5). Dependência externa: aplicar a `0007` no Cloud (controlador + usuário).
