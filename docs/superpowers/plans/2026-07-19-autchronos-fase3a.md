# Autchronos Fase 3A (Núcleo do caixa + capacidades) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar categorias, lançamentos (CRUD + filtros) e o dashboard de visão geral, com o modelo de capacidades por negócio gateando o que aparece — deixando a área logada mobile-first funcional.

**Architecture:** Rotas server-component sob `/painel/*` com um layout que faz o guard e a navegação; leitura via `criarClienteServidor` (RLS) e mutações via server actions. Flags de capacidade em `negocios` (migration `0006`) + RPC `resumo_dashboard` para os agregados. Lógica pura (capacidades, mapeamento de lançamento, série do gráfico) em `src/lib`, testada.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind · `@supabase/ssr` · Supabase (Postgres + RLS) · Recharts · Vitest.

## Global Constraints

- **Idioma:** pt-BR. **Moeda:** R$ `1.234,56` (`formatarBRL`); entrada de valor via `parseValorBRL`.
- **Design "Institucional Clássico":** tokens `marca` #0A2540, `dourado` #C9A227 (acento/saldo, só sobre navy), `entrada` #1B7A4B, `saida` #9B2335, `superficie`, `borda`, `texto`, `texto-suave`. **A cor da marca nunca representa dinheiro**; verde/vinho são exclusivos de valor.
- **Supabase via `@supabase/ssr`**; **Next 14: `cookies()` é SÍNCRONO**. Isolamento por RLS; `negocioAtual()` obtém o negócio do usuário.
- **Capacidades (flags `usa_*`):** `usa_fiado` → mostra o card "A receber"; `usa_carteiras` → mostra o seletor de carteira e a opção **Retirada** no formulário. Sem `usa_carteiras`, tudo é `empresa` e não há Retirada.
- **Regra da retirada:** `tipo=saida`, `carteira=empresa`, `eh_retirada=true`. Ela **reduz** o "Disponível hoje", mas **não** entra em "Saídas do mês" (não é despesa).
- **Migration `0006` precisa ser aplicada no Supabase Cloud** (projeto `trpjotkzjttwtyesmqyq`) — feito pelo usuário no SQL Editor, como a `0005`.
- **Alias `@/*` → `./src/*`.** Build pode travar no 1º run (Windows `0xC0000409`); rodar de novo.

---

## Estrutura de arquivos (3A)

```
supabase/migrations/0006_capacidades_e_resumo.sql
src/lib/negocio/capacidades.ts               # Flags + capacidadesPadrao(ramo)
src/lib/caixa/lancamento.ts                  # resolverLancamento(tipoUI, carteira)
src/lib/caixa/fluxo.ts                        # serieFluxoCaixa(...)
src/lib/supabase/negocioAtual.ts             # negocioAtual() (server)
src/app/painel/layout.tsx                     # guard + nav
src/components/painel/NavInferior.tsx
src/app/painel/configuracoes/page.tsx + acoes.ts
src/app/painel/categorias/page.tsx + acoes.ts + FormCategoria.tsx
src/app/painel/lancamentos/page.tsx + acoes.ts + FormLancamento.tsx + Filtros.tsx
src/app/painel/page.tsx                        # dashboard (substitui o placeholder)
src/components/painel/CardsSaldo.tsx, GraficoFluxo.tsx, UltimosLancamentos.tsx
src/app/onboarding/Wizard.tsx (modificar), src/app/onboarding/acoes.ts (modificar)
tests/capacidades.test.ts, tests/lancamento.test.ts, tests/fluxo.test.ts
```

---

### Task 1: Migration 0006 + `capacidades.ts` (puro) + verificação

**Files:**
- Create: `supabase/migrations/0006_capacidades_e_resumo.sql`, `src/lib/negocio/capacidades.ts`
- Modify: `scripts/verificar-banco.mjs`
- Test: `tests/capacidades.test.ts`

**Interfaces:**
- Produces: `type Flags`, `capacidadesPadrao(ramo: Ramo): Flags`; colunas `usa_*` em `negocios`; RPC `resumo_dashboard(p_negocio_id uuid) RETURNS jsonb`.

- [ ] **Step 1: Escrever o teste de `capacidadesPadrao` (falha primeiro)**

Create `tests/capacidades.test.ts`:
```ts
import { capacidadesPadrao } from "@/lib/negocio/capacidades";

test("locacao liga locacao e carteiras/metas, sem estoque", () => {
  expect(capacidadesPadrao("locacao")).toEqual({
    usa_estoque: false, usa_fiado: false, usa_locacao: true,
    usa_carteiras: true, usa_metas: true,
  });
});

test("revenda liga estoque e fiado", () => {
  const f = capacidadesPadrao("revenda");
  expect(f.usa_estoque).toBe(true);
  expect(f.usa_fiado).toBe(true);
  expect(f.usa_locacao).toBe(false);
});

test("servicos e outro nao ligam estoque/fiado/locacao", () => {
  for (const r of ["servicos", "outro"] as const) {
    const f = capacidadesPadrao(r);
    expect([f.usa_estoque, f.usa_fiado, f.usa_locacao]).toEqual([false, false, false]);
    expect([f.usa_carteiras, f.usa_metas]).toEqual([true, true]);
  }
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- capacidades`
Expected: FAIL "Cannot find module '@/lib/negocio/capacidades'".

- [ ] **Step 3: Implementar `capacidades.ts`**

Create `src/lib/negocio/capacidades.ts`:
```ts
import type { Ramo } from "@/lib/auth/roteamento";

export interface Flags {
  usa_estoque: boolean;
  usa_fiado: boolean;
  usa_locacao: boolean;
  usa_carteiras: boolean;
  usa_metas: boolean;
}

export const CAPACIDADES: { chave: keyof Flags; rotulo: string; descricao: string }[] = [
  { chave: "usa_estoque", rotulo: "Controle de estoque", descricao: "Acompanhar quantidade de produtos/ingredientes." },
  { chave: "usa_fiado", rotulo: "Vendas fiado / a prazo", descricao: "Vender fiado, no cartão ou parcelado (dinheiro entra depois)." },
  { chave: "usa_locacao", rotulo: "Aluguel de itens", descricao: "Alugar itens que saem e voltam." },
  { chave: "usa_carteiras", rotulo: "Separar empresa e pessoal", descricao: "Separar o dinheiro do negócio do seu e controlar retiradas." },
];

const BASE: Flags = {
  usa_estoque: false, usa_fiado: false, usa_locacao: false,
  usa_carteiras: true, usa_metas: true,
};

export function capacidadesPadrao(ramo: Ramo): Flags {
  switch (ramo) {
    case "alimentacao":
    case "beleza":
      return { ...BASE, usa_estoque: true };
    case "revenda":
      return { ...BASE, usa_estoque: true, usa_fiado: true };
    case "locacao":
      return { ...BASE, usa_locacao: true };
    default: // servicos, outro
      return { ...BASE };
  }
}
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- capacidades`
Expected: PASS (3 testes).

- [ ] **Step 5: Criar a migration 0006**

Create `supabase/migrations/0006_capacidades_e_resumo.sql`:
```sql
-- ============================================================
-- Capacidades por negocio (feature flags) + RPC de resumo do dashboard.
-- ============================================================

ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS usa_estoque   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_fiado     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_locacao   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_carteiras BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS usa_metas     BOOLEAN NOT NULL DEFAULT true;

-- Numeros-cabecalho do dashboard, por agregacao SQL. SECURITY DEFINER + e_membro
-- garante o isolamento. Retiradas reduzem o disponivel (saida da carteira
-- empresa) mas NAO entram em saidas_mes (nao sao despesa).
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
        AND tipo = 'entrada' AND data >= v_ini_mes), 0),
    'saidas_mes', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa'
        AND tipo = 'saida' AND NOT eh_retirada AND data >= v_ini_mes), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION resumo_dashboard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resumo_dashboard(UUID) TO authenticated;
```

- [ ] **Step 6: Estender `verificar-banco.mjs` com a checagem das flags (service_role)**

Modify `scripts/verificar-banco.mjs` — antes da linha final `console.log("VERIFICACAO OK");`, insira APENAS a checagem das colunas de flag (o `resumo_dashboard` NÃO pode ser testado aqui: ele tem guard `e_membro`, e a service_role tem `auth.uid()` nulo → "acesso negado"; ele é verificado autenticado no Step 7):
```js
// 3) flags de capacidade existem em negocios (defaults carteiras/metas = true)
const { data: negFlags, error: eFlags } = await sb
  .from("negocios")
  .select("usa_estoque, usa_fiado, usa_locacao, usa_carteiras, usa_metas")
  .eq("id", neg.id)
  .single();
assert(
  !eFlags && negFlags.usa_carteiras === true && negFlags.usa_metas === true && negFlags.usa_estoque === false,
  "negocios tem as flags usa_* com defaults corretos",
);
```

- [ ] **Step 7: Criar o verificador autenticado do `resumo_dashboard`**

Create `scripts/verificar-resumo.mjs`:
```js
// Verifica o resumo_dashboard COMO USUARIO AUTENTICADO (membro do negocio),
// porque a RPC exige e_membro. Cria usuario/negocio temporarios e limpa no fim.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!svc) { console.error("service_role vazia no .env.local"); process.exit(1); }

const admin = createClient(url, svc, { auth: { persistSession: false } });
function assert(c, m) { if (!c) { console.error("FALHOU:", m); process.exit(1); } console.log("ok:", m); }

const ts = Date.now();
const email = `resumo_${ts}@autchronos.test`;
const { data: u } = await admin.auth.admin.createUser({ email, password: "senha123", email_confirm: true });
const cli = createClient(url, anon, { auth: { persistSession: false } });
await cli.auth.signInWithPassword({ email, password: "senha123" });

const { data: negId } = await cli.rpc("criar_negocio", { p_nome: "Resumo", p_ramo: "outro" });
await cli.from("lancamentos").insert([
  { negocio_id: negId, tipo: "entrada", descricao: "venda", valor: 300, carteira: "empresa" },
  { negocio_id: negId, tipo: "saida", descricao: "retirada", valor: 100, carteira: "empresa", eh_retirada: true },
]);

const { data: resumo, error } = await cli.rpc("resumo_dashboard", { p_negocio_id: negId });
assert(!error, "resumo_dashboard executa para o membro");
assert(Number(resumo.disponivel) === 200, `disponivel = 300 - 100(retirada) = 200 (veio ${resumo?.disponivel})`);
assert(Number(resumo.entradas_mes) === 300, `entradas_mes = 300 (veio ${resumo?.entradas_mes})`);
assert(Number(resumo.saidas_mes) === 0, `saidas_mes ignora a retirada (veio ${resumo?.saidas_mes})`);

await admin.from("negocios").delete().eq("id", negId);
await admin.auth.admin.deleteUser(u.user.id);
console.log("RESUMO OK");
```

- [ ] **Step 8: Aplicar 0006 no Cloud e rodar as duas verificações**

Aplique `supabase/migrations/0006_capacidades_e_resumo.sql` no **SQL Editor** do Supabase (projeto `trpjotkzjttwtyesmqyq`).

Run:
```bash
node scripts/verificar-banco.mjs
node scripts/verificar-resumo.mjs
```
Expected: `VERIFICACAO OK` (com a asserção das flags) e `RESUMO OK` (disponível 200, saidas_mes 0). Se a `service_role` não estiver no `.env.local` ou a 0006 não estiver aplicada, reporte BLOCKED.

- [ ] **Step 9: Rodar suíte e commit**

Run: `npm test` → todos verdes.

```bash
git add supabase/migrations/0006_capacidades_e_resumo.sql src/lib/negocio/capacidades.ts scripts/verificar-banco.mjs scripts/verificar-resumo.mjs tests/capacidades.test.ts
git commit -m "feat: migration 0006 (capacidades + resumo_dashboard) e capacidadesPadrao"
```

---

### Task 2: Onboarding — passo de capacidades + gravar flags

**Files:**
- Modify: `src/app/onboarding/Wizard.tsx`, `src/app/onboarding/acoes.ts`

**Interfaces:**
- Consumes: `capacidadesPadrao`, `Flags`, `CAPACIDADES` (Task 1).
- Produces: onboarding grava as flags em `negocios`; seeding de itens condicional.

- [ ] **Step 1: Adicionar o passo de capacidades no `Wizard.tsx`**

Modify `src/app/onboarding/Wizard.tsx` — substitua o arquivo inteiro por:
```tsx
"use client";
import { useState, useTransition } from "react";
import { criarNegocioCompleto } from "@/app/onboarding/acoes";
import { parseValorBRL } from "@/lib/formato";
import { capacidadesPadrao, CAPACIDADES, type Flags } from "@/lib/negocio/capacidades";
import { nichoParaRamo } from "@/lib/auth/roteamento";

const NICHOS = ["Vendas de produtos", "Alimentação", "Aluguéis", "Serviços", "Outro"];

export function Wizard() {
  const [etapa, setEtapa] = useState(0);
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nicho, setNicho] = useState(NICHOS[0]);
  const [flags, setFlags] = useState<Flags>(() => capacidadesPadrao(nichoParaRamo(NICHOS[0])));
  const [whatsapp, setWhatsapp] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function escolherNicho(n: string) {
    setNicho(n);
    setFlags(capacidadesPadrao(nichoParaRamo(n))); // re-sugere pelas capacidades do ramo
  }

  function avancar() {
    if (etapa === 0 && !nomeNegocio.trim()) {
      setErro("Informe o nome do negócio.");
      return;
    }
    setErro(null);
    setEtapa((e) => e + 1);
  }

  function concluir() {
    setErro(null);
    iniciar(async () => {
      const r = await criarNegocioCompleto({
        nomeNegocio: nomeNegocio.trim(),
        nicho,
        flags,
        whatsapp,
        saldoInicial: parseValorBRL(saldoInicial),
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  const campo = "w-full rounded-md border border-borda bg-superficie px-3 py-2 text-texto";
  const botao = "rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60";
  const ULTIMA = 4;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-texto-suave">Etapa {etapa + 1} de 5</p>

      {etapa === 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Nome do negócio
          <input className={campo} value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} />
        </label>
      )}

      {etapa === 1 && (
        <label className="flex flex-col gap-1 text-sm">
          Nicho do negócio
          <select className={campo} value={nicho} onChange={(e) => escolherNicho(e.target.value)}>
            {NICHOS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}

      {etapa === 2 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm text-texto-suave">O que seu negócio usa? (pode ajustar depois)</legend>
          {CAPACIDADES.map((c) => (
            <label key={c.chave} className="flex items-start gap-3 rounded-md border border-borda p-3 text-sm">
              <input
                type="checkbox"
                checked={flags[c.chave]}
                onChange={(e) => setFlags((f) => ({ ...f, [c.chave]: e.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-texto">{c.rotulo}</span>
                <span className="block text-texto-suave">{c.descricao}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {etapa === 3 && (
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp para lançamentos (com DDD)
          <input className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
        </label>
      )}

      {etapa === 4 && (
        <label className="flex flex-col gap-1 text-sm">
          Saldo inicial em caixa (opcional)
          <input className={campo} value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>
      )}

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}

      <div className="flex justify-between">
        <button type="button" onClick={() => setEtapa((e) => Math.max(0, e - 1))} disabled={etapa === 0 || pendente}
          className="rounded-md border border-borda px-4 py-2 text-texto-suave disabled:opacity-40">
          Voltar
        </button>
        {etapa < ULTIMA ? (
          <button type="button" onClick={avancar} className={botao}>Continuar</button>
        ) : (
          <button type="button" onClick={concluir} disabled={pendente} className={botao}>
            {pendente ? "Criando..." : "Concluir"}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Gravar as flags e semear itens condicionalmente em `acoes.ts`**

Modify `src/app/onboarding/acoes.ts` — atualize o import, a interface e o corpo:

Troque o bloco de imports/interface por:
```ts
"use server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { nichoParaRamo } from "@/lib/auth/roteamento";
import { templateDoRamo } from "@/templates/ramos";
import { normalizarTelefone } from "@/lib/telefone";
import type { Flags } from "@/lib/negocio/capacidades";

export interface DadosOnboarding {
  nomeNegocio: string;
  nicho: string;
  flags: Flags;
  whatsapp: string;
  saldoInicial: number;
}
```

Logo após o bloco que checa `eRpc || !negocioId`, insira (grava as flags):
```ts
  // Grava as capacidades escolhidas (o dono pode UPDATE via negocios_update).
  await supabase.from("negocios").update(dados.flags).eq("id", negocioId);
```

Substitua o bloco de seeding de itens por (condicional):
```ts
  if (template.itens.length && (dados.flags.usa_estoque || dados.flags.usa_locacao)) {
    const { error } = await supabase
      .from("itens")
      .insert(template.itens.map((i) => ({ ...i, negocio_id: negocioId })));
    if (error) problemas.push("os itens de exemplo");
  }
```

- [ ] **Step 3: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

```bash
git add src/app/onboarding/Wizard.tsx src/app/onboarding/acoes.ts
git commit -m "feat: onboarding grava capacidades (passo pre-marcado pelo ramo)"
```

---

### Task 3: Área logada — `negocioAtual`, layout, navegação e Configurações

**Files:**
- Create: `src/lib/supabase/negocioAtual.ts`, `src/app/painel/layout.tsx`, `src/components/painel/NavInferior.tsx`, `src/app/painel/configuracoes/page.tsx`, `src/app/painel/configuracoes/acoes.ts`, `src/app/painel/configuracoes/FormCapacidades.tsx`

**Interfaces:**
- Consumes: `sair` (`@/app/painel/acoes`), `criarClienteServidor`, `CAPACIDADES`, `Flags`.
- Produces: `negocioAtual(): Promise<NegocioAtual | null>`; layout `/painel/*` com guard + nav; `/painel/configuracoes`.

- [ ] **Step 1: `negocioAtual` (server helper)**

Create `src/lib/supabase/negocioAtual.ts`:
```ts
import { criarClienteServidor } from "@/lib/supabase/servidor";

export interface NegocioAtual {
  id: string;
  nome: string;
  usa_estoque: boolean;
  usa_fiado: boolean;
  usa_locacao: boolean;
  usa_carteiras: boolean;
  usa_metas: boolean;
}

export async function negocioAtual(): Promise<NegocioAtual | null> {
  const supabase = criarClienteServidor();
  const { data } = await supabase
    .from("negocios")
    .select("id, nome, usa_estoque, usa_fiado, usa_locacao, usa_carteiras, usa_metas")
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
```

- [ ] **Step 2: Navegação inferior**

Create `src/components/painel/NavInferior.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/painel", rotulo: "Início" },
  { href: "/painel/lancamentos", rotulo: "Lançamentos" },
  { href: "/painel/categorias", rotulo: "Categorias" },
  { href: "/painel/configuracoes", rotulo: "Config" },
];

export function NavInferior() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-superficie">
      <div className="mx-auto flex max-w-2xl">
        {ITENS.map((i) => {
          const ativo = i.href === "/painel" ? path === "/painel" : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href}
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

- [ ] **Step 3: Layout da área logada**

Create `src/app/painel/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { NavInferior } from "@/components/painel/NavInferior";
import { sair } from "@/app/painel/acoes";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const negocio = await negocioAtual();
  if (!negocio) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-20 pt-6">
      <header className="mb-4 flex items-center justify-between border-b border-borda pb-3">
        <p className="font-serif text-lg font-bold text-marca">{negocio.nome}</p>
        <form action={sair}>
          <button type="submit" className="text-sm text-texto-suave hover:text-texto">Sair</button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
      <NavInferior />
    </div>
  );
}
```

- [ ] **Step 4: Server action de capacidades**

Create `src/app/painel/configuracoes/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import type { Flags } from "@/lib/negocio/capacidades";

export async function salvarCapacidades(flags: Flags) {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("negocios").update(flags).eq("id", negocio.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/painel");
  return { ok: true };
}
```

- [ ] **Step 5: Formulário de capacidades (client)**

Create `src/app/painel/configuracoes/FormCapacidades.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarCapacidades } from "@/app/painel/configuracoes/acoes";
import { CAPACIDADES, type Flags } from "@/lib/negocio/capacidades";

export function FormCapacidades({ inicial }: { inicial: Flags }) {
  const [flags, setFlags] = useState<Flags>(inicial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarCapacidades(flags);
      setMsg(r?.erro ?? "Salvo!");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {CAPACIDADES.map((c) => (
        <label key={c.chave} className="flex items-start gap-3 rounded-md border border-borda p-3 text-sm">
          <input type="checkbox" checked={flags[c.chave]} onChange={(e) => setFlags((f) => ({ ...f, [c.chave]: e.target.checked }))} className="mt-1" />
          <span>
            <span className="font-medium text-texto">{c.rotulo}</span>
            <span className="block text-texto-suave">{c.descricao}</span>
          </span>
        </label>
      ))}
      <button type="button" onClick={salvar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Salvando..." : "Salvar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Página de Configurações**

Create `src/app/painel/configuracoes/page.tsx`:
```tsx
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { FormCapacidades } from "@/app/painel/configuracoes/FormCapacidades";

export default async function Configuracoes() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const flags = {
    usa_estoque: negocio.usa_estoque, usa_fiado: negocio.usa_fiado,
    usa_locacao: negocio.usa_locacao, usa_carteiras: negocio.usa_carteiras,
    usa_metas: negocio.usa_metas,
  };
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Configurações</h1>
      <p className="text-sm text-texto-suave">Ligue ou desligue os módulos do seu negócio.</p>
      <FormCapacidades inicial={flags} />
    </section>
  );
}
```

- [ ] **Step 7: Build e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes. Nota: o placeholder atual em `src/app/painel/page.tsx` continua funcionando dentro do novo layout até a Task 6.

```bash
git add src/lib/supabase/negocioAtual.ts src/app/painel/layout.tsx src/components/painel/NavInferior.tsx src/app/painel/configuracoes
git commit -m "feat: layout da area logada (guard + nav inferior) e Configuracoes de capacidades"
```

---

### Task 4: Categorias (CRUD)

**Files:**
- Create: `src/app/painel/categorias/page.tsx`, `src/app/painel/categorias/acoes.ts`, `src/app/painel/categorias/FormCategoria.tsx`

**Interfaces:**
- Consumes: `criarClienteServidor`, `negocioAtual`.
- Produces: server actions `criarCategoria(nome, tipo)` / `excluirCategoria(id)`.

- [ ] **Step 1: Server actions**

Create `src/app/painel/categorias/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export async function criarCategoria(nome: string, tipo: "entrada" | "saida") {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { erro: "Informe o nome." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("categorias").insert({ negocio_id: negocio.id, nome: nomeLimpo, tipo });
  if (error) {
    return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome e tipo." : "Não foi possível criar." };
  }
  revalidatePath("/painel/categorias");
  return { ok: true };
}

export async function excluirCategoria(id: string) {
  const supabase = criarClienteServidor();
  await supabase.from("categorias").delete().eq("id", id);
  revalidatePath("/painel/categorias");
}
```

- [ ] **Step 2: Formulário (client)**

Create `src/app/painel/categorias/FormCategoria.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { criarCategoria } from "@/app/painel/categorias/acoes";

export function FormCategoria() {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function adicionar() {
    setErro(null);
    iniciar(async () => {
      const r = await criarCategoria(nome, tipo);
      if (r?.erro) { setErro(r.erro); return; }
      setNome("");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-borda p-3">
      <div className="flex gap-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova categoria"
          className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}
          className="rounded-md border border-borda bg-superficie px-2 text-sm text-texto">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </div>
      <button type="button" onClick={adicionar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Adicionando..." : "Adicionar categoria"}
      </button>
      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página de categorias**

Create `src/app/painel/categorias/page.tsx`:
```tsx
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormCategoria } from "@/app/painel/categorias/FormCategoria";
import { excluirCategoria } from "@/app/painel/categorias/acoes";

export default async function Categorias() {
  const supabase = criarClienteServidor();
  const { data: categorias } = await supabase
    .from("categorias").select("id, nome, tipo").order("nome");
  const lista = categorias ?? [];
  const entradas = lista.filter((c) => c.tipo === "entrada");
  const saidas = lista.filter((c) => c.tipo === "saida");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Categorias</h1>
      <FormCategoria />
      {[["Entradas", entradas, "text-entrada"], ["Saídas", saidas, "text-saida"]].map(
        ([titulo, itens, cor]) => (
          <div key={titulo as string}>
            <h2 className={`text-sm font-semibold ${cor}`}>{titulo as string}</h2>
            <ul className="mt-2 divide-y divide-borda rounded-md border border-borda">
              {(itens as { id: string; nome: string }[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm text-texto">
                  {c.nome}
                  <form action={excluirCategoria.bind(null, c.id)}>
                    <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                  </form>
                </li>
              ))}
              {(itens as unknown[]).length === 0 && (
                <li className="px-3 py-2 text-sm text-texto-suave">Nenhuma ainda.</li>
              )}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}
```

- [ ] **Step 4: Build e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

```bash
git add src/app/painel/categorias
git commit -m "feat: CRUD de categorias"
```

---

### Task 5: Lançamentos (mapeamento puro + form + lista com filtros + CRUD)

**Files:**
- Create: `src/lib/caixa/lancamento.ts`, `src/app/painel/lancamentos/page.tsx`, `src/app/painel/lancamentos/acoes.ts`, `src/app/painel/lancamentos/FormLancamento.tsx`
- Test: `tests/lancamento.test.ts`

**Interfaces:**
- Consumes: `parseValorBRL`, `formatarBRL`, `negocioAtual`, `criarClienteServidor`.
- Produces: `resolverLancamento(tipoUI, carteira)`; server actions `salvarLancamento` / `excluirLancamento`.

- [ ] **Step 1: Teste de `resolverLancamento` (falha primeiro)**

Create `tests/lancamento.test.ts`:
```ts
import { resolverLancamento } from "@/lib/caixa/lancamento";

test("entrada mantem tipo e carteira, sem retirada", () => {
  expect(resolverLancamento("entrada", "pessoal")).toEqual({ tipo: "entrada", carteira: "pessoal", eh_retirada: false });
});

test("saida mantem tipo e carteira", () => {
  expect(resolverLancamento("saida", "empresa")).toEqual({ tipo: "saida", carteira: "empresa", eh_retirada: false });
});

test("retirada forca saida/empresa/eh_retirada", () => {
  expect(resolverLancamento("retirada", "pessoal")).toEqual({ tipo: "saida", carteira: "empresa", eh_retirada: true });
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- lancamento`
Expected: FAIL "Cannot find module '@/lib/caixa/lancamento'".

- [ ] **Step 3: Implementar `lancamento.ts`**

Create `src/lib/caixa/lancamento.ts`:
```ts
export type TipoUI = "entrada" | "saida" | "retirada";
export type Carteira = "empresa" | "pessoal";

export interface LancamentoResolvido {
  tipo: "entrada" | "saida";
  carteira: Carteira;
  eh_retirada: boolean;
}

export function resolverLancamento(tipoUI: TipoUI, carteira: Carteira): LancamentoResolvido {
  if (tipoUI === "retirada") {
    return { tipo: "saida", carteira: "empresa", eh_retirada: true };
  }
  return { tipo: tipoUI, carteira, eh_retirada: false };
}
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- lancamento`
Expected: PASS (3 testes).

- [ ] **Step 5: Server actions**

Create `src/app/painel/lancamentos/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { resolverLancamento, type TipoUI, type Carteira } from "@/lib/caixa/lancamento";

export interface DadosLancamento {
  id?: string;
  tipoUI: TipoUI;
  carteira: Carteira;
  valor: number;
  descricao: string;
  data: string; // YYYY-MM-DD
  categoria_id: string | null;
}

export async function salvarLancamento(d: DadosLancamento) {
  if (d.valor <= 0) return { erro: "Informe um valor maior que zero." };
  if (!d.descricao.trim()) return { erro: "Informe uma descrição." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const r = resolverLancamento(d.tipoUI, d.carteira);

  const payload = {
    negocio_id: negocio.id,
    tipo: r.tipo,
    carteira: r.carteira,
    eh_retirada: r.eh_retirada,
    valor: d.valor,
    descricao: d.descricao.trim(),
    data: d.data,
    categoria_id: r.eh_retirada ? null : d.categoria_id,
  };

  const resp = d.id
    ? await supabase.from("lancamentos").update(payload).eq("id", d.id)
    : await supabase.from("lancamentos").insert(payload);
  if (resp.error) return { erro: "Não foi possível salvar o lançamento." };

  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
  redirect("/painel/lancamentos");
}

export async function excluirLancamento(id: string) {
  const supabase = criarClienteServidor();
  await supabase.from("lancamentos").delete().eq("id", id);
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
}
```

- [ ] **Step 6: Formulário de lançamento (client)**

Create `src/app/painel/lancamentos/FormLancamento.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarLancamento } from "@/app/painel/lancamentos/acoes";
import { parseValorBRL } from "@/lib/formato";
import type { TipoUI, Carteira } from "@/lib/caixa/lancamento";

interface Categoria { id: string; nome: string; tipo: "entrada" | "saida" }

export function FormLancamento({
  categorias, usaCarteiras, hoje,
}: { categorias: Categoria[]; usaCarteiras: boolean; hoje: string }) {
  const [tipoUI, setTipoUI] = useState<TipoUI>("entrada");
  const [carteira, setCarteira] = useState<Carteira>("empresa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const tipoCategoria = tipoUI === "entrada" ? "entrada" : "saida";
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoCategoria);
  const campo = "w-full rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function enviar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarLancamento({
        tipoUI, carteira, valor: parseValorBRL(valor), descricao, data,
        categoria_id: categoriaId || null,
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["entrada", "saida", ...(usaCarteiras ? ["retirada"] as const : [])] as TipoUI[]).map((t) => (
          <button key={t} type="button" onClick={() => setTipoUI(t)}
            className={`flex-1 rounded-md border px-2 py-2 text-sm capitalize ${tipoUI === t ? "border-marca bg-marca text-white" : "border-borda text-texto-suave"}`}>
            {t}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">Valor
        <input className={campo} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
      </label>
      <label className="flex flex-col gap-1 text-sm">Descrição
        <input className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Data
        <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} />
      </label>

      {tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Categoria
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categoriasFiltradas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      )}

      {usaCarteiras && tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Carteira
          <select className={campo} value={carteira} onChange={(e) => setCarteira(e.target.value as Carteira)}>
            <option value="empresa">Empresa</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </label>
      )}

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      <button type="button" onClick={enviar} disabled={pendente}
        className="rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Salvando..." : "Salvar lançamento"}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Página de lançamentos (lista + filtros + form)**

Create `src/app/painel/lancamentos/page.tsx`:
```tsx
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { FormLancamento } from "@/app/painel/lancamentos/FormLancamento";
import { excluirLancamento } from "@/app/painel/lancamentos/acoes";

function intervaloPeriodo(periodo: string | undefined, hoje: Date) {
  const y = hoje.getFullYear(), m = hoje.getMonth();
  if (periodo === "mes_passado") return { de: new Date(y, m - 1, 1), ate: new Date(y, m, 0) };
  if (periodo === "ultimos_30") return { de: new Date(y, m, hoje.getDate() - 29), ate: hoje };
  if (periodo === "tudo") return null;
  return { de: new Date(y, m, 1), ate: new Date(y, m + 1, 0) }; // mes atual (default)
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function Lancamentos({
  searchParams,
}: { searchParams: { periodo?: string; tipo?: string; origem?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const hojeStr = new Date().toISOString().slice(0, 10);

  const { data: categorias } = await supabase.from("categorias").select("id, nome, tipo").order("nome");

  let q = supabase.from("lancamentos")
    .select("id, tipo, descricao, valor, data, origem, eh_retirada")
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(200);

  const range = intervaloPeriodo(searchParams.periodo, new Date());
  if (range) q = q.gte("data", iso(range.de)).lte("data", iso(range.ate));
  if (searchParams.tipo === "entrada" || searchParams.tipo === "saida") q = q.eq("tipo", searchParams.tipo);
  if (searchParams.origem === "app" || searchParams.origem === "whatsapp") q = q.eq("origem", searchParams.origem);

  const { data: lancamentos } = await q;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Lançamentos</h1>

      <details className="rounded-md border border-borda p-3">
        <summary className="cursor-pointer text-sm font-medium text-marca">Novo lançamento</summary>
        <div className="mt-3">
          <FormLancamento categorias={categorias ?? []} usaCarteiras={negocio.usa_carteiras} hoje={hojeStr} />
        </div>
      </details>

      <form method="get" className="flex flex-wrap gap-2 text-sm">
        <select name="periodo" defaultValue={searchParams.periodo ?? "mes_atual"} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="mes_atual">Mês atual</option>
          <option value="mes_passado">Mês passado</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="tudo">Tudo</option>
        </select>
        <select name="tipo" defaultValue={searchParams.tipo ?? ""} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>
        <select name="origem" defaultValue={searchParams.origem ?? ""} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Toda origem</option>
          <option value="app">App</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <button type="submit" className="rounded-md border border-borda px-3 py-1 text-texto-suave hover:text-texto">Filtrar</button>
      </form>

      <ul className="divide-y divide-borda rounded-md border border-borda">
        {(lancamentos ?? []).map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate text-texto">{l.descricao}{l.eh_retirada ? " (retirada)" : ""}</p>
              <p className="text-xs text-texto-suave">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")} · {l.origem}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={l.tipo === "entrada" ? "text-entrada" : "text-saida"}>
                {l.tipo === "entrada" ? "+" : "-"}{formatarBRL(Number(l.valor))}
              </span>
              <form action={excluirLancamento.bind(null, l.id)}>
                <button type="submit" className="text-xs text-texto-suave hover:text-saida">×</button>
              </form>
            </div>
          </li>
        ))}
        {(lancamentos ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-texto-suave">Nenhum lançamento no período.</li>}
      </ul>
    </section>
  );
}
```

- [ ] **Step 8: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

```bash
git add src/lib/caixa/lancamento.ts src/app/painel/lancamentos tests/lancamento.test.ts
git commit -m "feat: lancamentos (form entrada/saida/retirada, lista com filtros, CRUD)"
```

---

### Task 6: Dashboard (série pura + Recharts + cards + últimos)

**Files:**
- Create: `src/lib/caixa/fluxo.ts`, `src/components/painel/GraficoFluxo.tsx`, `src/components/painel/CardsSaldo.tsx`, `src/components/painel/UltimosLancamentos.tsx`
- Modify: `src/app/painel/page.tsx` (substitui o placeholder)
- Test: `tests/fluxo.test.ts`

**Interfaces:**
- Consumes: `resumo_dashboard` (RPC), `formatarBRL`, `negocioAtual`, `criarClienteServidor`.
- Produces: `serieFluxoCaixa(lancs, disponivelAtual, hoje)`; componentes do dashboard.

- [ ] **Step 1: Instalar Recharts**

Run:
```bash
npm install recharts
```

- [ ] **Step 2: Teste de `serieFluxoCaixa` (falha primeiro)**

Create `tests/fluxo.test.ts`:
```ts
import { serieFluxoCaixa } from "@/lib/caixa/fluxo";

const L = (data: string, tipo: "entrada" | "saida", valor: number) => ({ data, tipo, valor });

test("reconstroi o saldo diario terminando no disponivel atual", () => {
  // disponivel hoje = 150; no periodo houve +100 (dia 2) e -50 (dia 3).
  const serie = serieFluxoCaixa(
    [L("2026-07-02", "entrada", 100), L("2026-07-03", "saida", 50)],
    150,
    new Date("2026-07-03T12:00:00"),
  );
  // abertura = 150 - (100 - 50) = 100
  expect(serie[0].saldo).toBe(100);            // 2026-06-04 (dia -29), sem mov
  expect(serie[serie.length - 1].saldo).toBe(150); // hoje
  expect(serie).toHaveLength(30);
});

test("dia da entrada sobe o saldo, dia da saida desce", () => {
  const serie = serieFluxoCaixa([L("2026-07-03", "entrada", 40)], 40, new Date("2026-07-03T12:00:00"));
  expect(serie[serie.length - 1].saldo).toBe(40);
  expect(serie[serie.length - 2].saldo).toBe(0); // vespera
});
```

- [ ] **Step 3: Rodar para confirmar a falha**

Run: `npm test -- fluxo`
Expected: FAIL "Cannot find module '@/lib/caixa/fluxo'".

- [ ] **Step 4: Implementar `fluxo.ts`**

Create `src/lib/caixa/fluxo.ts`:
```ts
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

  const netPorDia = new Map<string, number>();
  let netPeriodo = 0;
  for (const l of lancamentos) {
    if (l.data >= primeiro) {
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
```

- [ ] **Step 5: Rodar para confirmar verde**

Run: `npm test -- fluxo`
Expected: PASS (2 testes).

- [ ] **Step 6: Gráfico (Recharts, client)**

Create `src/components/painel/GraficoFluxo.tsx`:
```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PontoFluxo } from "@/lib/caixa/fluxo";
import { formatarBRL } from "@/lib/formato";

export function GraficoFluxo({ serie }: { serie: PontoFluxo[] }) {
  const dados = serie.map((p) => ({ ...p, dia: p.data.slice(8, 10) + "/" + p.data.slice(5, 7) }));
  return (
    <div className="h-48 w-full rounded-xl border border-borda bg-superficie p-3">
      <p className="mb-2 text-sm text-texto-suave">Fluxo de caixa (30 dias)</p>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={dados} margin={{ left: 4, right: 4 }}>
          <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={6} stroke="var(--cor-texto-suave)" />
          <YAxis hide />
          <Tooltip formatter={(v: number) => formatarBRL(v)} labelFormatter={(l) => `Dia ${l}`} />
          <Line type="monotone" dataKey="saldo" stroke="var(--cor-marca)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 7: Cards de saldo e últimos lançamentos**

Create `src/components/painel/CardsSaldo.tsx`:
```tsx
import { formatarBRL } from "@/lib/formato";

export function CardsSaldo({
  disponivel, aReceber, entradasMes, saidasMes, mostrarAReceber,
}: { disponivel: number; aReceber: number; entradasMes: number; saidasMes: number; mostrarAReceber: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-borda bg-marca text-white">
          <div className="p-4">
            <p className="text-sm opacity-80">Disponível hoje</p>
            <p className="font-serif text-3xl font-bold text-dourado">{formatarBRL(disponivel)}</p>
          </div>
        </div>
        {mostrarAReceber && (
          <div className="rounded-xl border border-borda bg-superficie p-4">
            <p className="text-sm text-texto-suave">A receber</p>
            <p className="font-serif text-3xl font-bold text-texto">{formatarBRL(aReceber)}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-borda bg-superficie p-4">
          <p className="text-sm text-texto-suave">Entradas do mês</p>
          <p className="text-xl font-bold text-entrada">{formatarBRL(entradasMes)}</p>
        </div>
        <div className="rounded-xl border border-borda bg-superficie p-4">
          <p className="text-sm text-texto-suave">Saídas do mês</p>
          <p className="text-xl font-bold text-saida">{formatarBRL(saidasMes)}</p>
        </div>
      </div>
    </div>
  );
}
```

Create `src/components/painel/UltimosLancamentos.tsx`:
```tsx
import Link from "next/link";
import { formatarBRL } from "@/lib/formato";

interface Item { id: string; descricao: string; valor: number; tipo: "entrada" | "saida"; data: string }

export function UltimosLancamentos({ itens }: { itens: Item[] }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-4 py-2">
        <p className="text-sm font-semibold text-texto">Últimos lançamentos</p>
        <Link href="/painel/lancamentos" className="text-xs text-marca">Ver todos</Link>
      </div>
      <ul className="divide-y divide-borda">
        {itens.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="truncate text-texto">{l.descricao}</span>
            <span className={l.tipo === "entrada" ? "text-entrada" : "text-saida"}>
              {l.tipo === "entrada" ? "+" : "-"}{formatarBRL(Number(l.valor))}
            </span>
          </li>
        ))}
        {itens.length === 0 && <li className="px-4 py-6 text-center text-sm text-texto-suave">Nada ainda. Faça seu primeiro lançamento.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8: Dashboard em `page.tsx`**

Modify `src/app/painel/page.tsx` — substitua o arquivo inteiro por:
```tsx
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { serieFluxoCaixa } from "@/lib/caixa/fluxo";
import { CardsSaldo } from "@/components/painel/CardsSaldo";
import { GraficoFluxo } from "@/components/painel/GraficoFluxo";
import { UltimosLancamentos } from "@/components/painel/UltimosLancamentos";

export default async function Painel() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();

  const { data: resumo } = await supabase.rpc("resumo_dashboard", { p_negocio_id: negocio.id });
  const r = resumo ?? { disponivel: 0, a_receber: 0, entradas_mes: 0, saidas_mes: 0 };

  const hoje = new Date();
  const de = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29).toISOString().slice(0, 10);
  const { data: lancs30 } = await supabase
    .from("lancamentos").select("data, tipo, valor")
    .eq("carteira", "empresa").gte("data", de).order("data");
  const { data: ultimos } = await supabase
    .from("lancamentos").select("id, descricao, valor, tipo, data")
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(10);

  const serie = serieFluxoCaixa(
    (lancs30 ?? []).map((l) => ({ data: l.data, tipo: l.tipo, valor: Number(l.valor) })),
    Number(r.disponivel), hoje,
  );

  return (
    <section className="flex flex-col gap-4">
      <CardsSaldo
        disponivel={Number(r.disponivel)}
        aReceber={Number(r.a_receber)}
        entradasMes={Number(r.entradas_mes)}
        saidasMes={Number(r.saidas_mes)}
        mostrarAReceber={negocio.usa_fiado}
      />
      <GraficoFluxo serie={serie} />
      <UltimosLancamentos itens={(ultimos ?? []).map((l) => ({ ...l, valor: Number(l.valor) }))} />
    </section>
  );
}
```

- [ ] **Step 9: Build, testes e verificação manual**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

Verificação manual (não bloqueia commit): `npm run dev`, logar, criar uma Entrada e uma Saída, ver "Disponível hoje", o gráfico e os últimos lançamentos reagirem; conferir que "A receber" só aparece se `usa_fiado` (alterável em Configurações).

- [ ] **Step 10: Commit**

```bash
git add src/lib/caixa/fluxo.ts src/components/painel/GraficoFluxo.tsx src/components/painel/CardsSaldo.tsx src/components/painel/UltimosLancamentos.tsx src/app/painel/page.tsx tests/fluxo.test.ts package.json package-lock.json
git commit -m "feat: dashboard (dois saldos, grafico de fluxo 30d, ultimos lancamentos)"
```

---

## Self-Review (cobertura da spec)

- **Migration 0006 (flags + resumo_dashboard) + verificação** → Task 1. ✓
- **capacidadesPadrao por ramo (pura, testada)** → Task 1. ✓
- **Onboarding: passo de capacidades pré-marcado + grava flags + seeding condicional** → Task 2. ✓
- **Área logada: layout com guard, nav inferior mobile, negocioAtual** → Task 3. ✓
- **Configurações (toggles das capacidades)** → Task 3. ✓
- **Categorias CRUD** → Task 4. ✓
- **Lançamentos: form Entrada/Saída/Retirada (carteira gated por usa_carteiras), lista com filtros, CRUD; resolverLancamento puro** → Task 5. ✓
- **Dashboard: Disponível hoje + A receber (gated por usa_fiado) + entradas/saídas do mês (retirada fora das saídas) + gráfico Recharts 30d + últimos** → Task 6. ✓
- **Regra da retirada (reduz disponível, fora de saídas_mes)** → migration 0006 (RPC) + verificação (Task 1). ✓
- **Cor: marca nunca em dinheiro; dourado só no saldo sobre navy** → CardsSaldo. ✓

Fora de escopo (correto): tela de retiradas/pró-labore (3B), relatórios/CSV (3C), módulos de estoque/locação/a-receber (Fases 4/5). Dependência externa: aplicar a `0006` no Cloud (Task 1, Step 7).
