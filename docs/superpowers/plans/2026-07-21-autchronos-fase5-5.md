# Fase 5.5 — Hardening pré-deploy — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL: superpowers:subagent-driven-development ou executing-plans. Passos usam checkbox (`- [ ]`).

**Goal:** Telas de erro/loading/404, guardião de RLS, CSV anti-injeção e checklist de deploy — antes de subir para produção.

**Architecture:** 100% código (fora o checklist, que é doc). Sem migration. Reaproveita tokens institucionais.

**Tech Stack:** Next.js 14 App Router (error/loading/not-found conventions), Node script, Vitest.

## Global Constraints

- Telas de erro/loading/404 no visual institucional (fundo `bg-fundo`, navy `text-marca`, serifada no título, dourado acento). Nunca opacidade em token var. Copy pt-BR, sem vazar detalhes técnicos.
- `global-error.tsx` renderiza suas próprias `<html><body>` (substitui o layout raiz) → usar estilos inline com os hex da paleta (#0A2540 navy, #F7F8FA fundo, #C9A227 dourado, #5b6672 texto-suave).
- Sem migration; sem tocar em lógica de domínio.

## File Structure

- `src/app/painel/loading.tsx`, `src/app/painel/error.tsx` (novos) — boundaries do painel.
- `src/app/global-error.tsx`, `src/app/not-found.tsx` (novos) — raiz.
- `scripts/verificar-rls.mjs` (novo) + `package.json` (script) — auditoria de RLS.
- `src/lib/relatorio/csv.ts` (novo) + `tests/csv.test.ts` + `src/app/painel/relatorios/csv/route.ts` (modificar) — CSV anti-injeção.
- `docs/deploy-checklist.md` (novo) — roteiro do deploy.

---

### Task 1: Telas de erro / carregamento / 404

**Files:**
- Create: `src/app/painel/loading.tsx`, `src/app/painel/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`

- [ ] **Step 1: Loading do painel**

Create `src/app/painel/loading.tsx`:
```tsx
export default function Carregando() {
  return (
    <div className="mx-auto flex max-w-3xl animate-pulse flex-col gap-4 px-4 py-6">
      <div className="h-8 w-40 border border-borda bg-superficie" />
      <div className="h-24 border border-borda bg-superficie" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 border border-borda bg-superficie" />
        <div className="h-20 border border-borda bg-superficie" />
      </div>
      <div className="h-40 border border-borda bg-superficie" />
      <p className="text-center text-xs uppercase tracking-wider text-texto-suave">Carregando…</p>
    </div>
  );
}
```

- [ ] **Step 2: Error boundary do painel**

Create `src/app/painel/error.tsx`:
```tsx
"use client";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="font-serif text-2xl text-marca">Algo deu errado</h1>
      <p className="text-sm text-texto-suave">Não foi possível carregar esta tela. Tente de novo em instantes.</p>
      <button type="button" onClick={reset}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90">
        Tentar de novo
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Global error (raiz)**

Create `src/app/global-error.tsx`:
```tsx
"use client";

export default function ErroGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA", color: "#0A2540", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: "#5b6672", margin: "0 0 16px" }}>Recarregue a página para continuar.</p>
          <button onClick={reset} style={{ background: "#0A2540", color: "#fff", border: 0, padding: "8px 16px", textTransform: "uppercase", letterSpacing: 1, fontSize: 13, cursor: "pointer" }}>
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Not-found (404) raiz**

Create `src/app/not-found.tsx`:
```tsx
import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fundo px-4 text-center">
      <p className="font-serif text-5xl text-dourado">404</p>
      <h1 className="font-serif text-2xl text-marca">Página não encontrada</h1>
      <p className="text-sm text-texto-suave">O endereço que você tentou abrir não existe.</p>
      <Link href="/" className="border border-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
        Voltar ao início
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Build + testes**

Run: `npm run build` (se `.next` der erro OneDrive: `rm -rf .next` e repetir) e `npm test` → verdes. Conferir que o build lista as rotas sem erro.

- [ ] **Step 6: Commit**

```bash
git add src/app/painel/loading.tsx src/app/painel/error.tsx src/app/global-error.tsx src/app/not-found.tsx
git commit -m "feat: telas de erro/loading/404 institucionais (boundaries do painel + raiz)"
```

---

### Task 2: Auditoria de RLS (guardião de regressão)

**Files:**
- Create: `scripts/verificar-rls.mjs`
- Modify: `package.json`

- [ ] **Step 1: Script**

Create `scripts/verificar-rls.mjs`:
```js
// Le as migrations e garante que toda tabela criada em public tem RLS + policy.
// Guardiao de regressao: quebra se uma fase futura criar tabela sem RLS.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join(dir, f), "utf8")).join("\n");

const tabelas = new Set();
for (const m of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/gi)) tabelas.add(m[1].toLowerCase());

const comRLS = new Set();
for (const m of sql.matchAll(/ALTER TABLE\s+(\w+)\s+ENABLE ROW LEVEL SECURITY/gi)) comRLS.add(m[1].toLowerCase());

const comPolicy = new Set();
for (const m of sql.matchAll(/CREATE POLICY\s+\w+\s+ON\s+(\w+)/gi)) comPolicy.add(m[1].toLowerCase());

let falhou = false;
for (const t of [...tabelas].sort()) {
  const rls = comRLS.has(t), pol = comPolicy.has(t);
  if (!rls || !pol) {
    falhou = true;
    const faltas = [!rls && "sem RLS", !pol && "sem policy"].filter(Boolean).join(" e ");
    console.error(`FALHOU: tabela "${t}" ${faltas}`);
  } else {
    console.log(`ok: ${t} (RLS + policy)`);
  }
}
if (falhou) { console.error("\nRLS INCOMPLETA"); process.exit(1); }
console.log(`\nRLS OK (${tabelas.size} tabelas)`);
```

- [ ] **Step 2: npm script**

Modify `package.json` — no bloco `"scripts"`, adicionar:
```json
    "verificar:rls": "node scripts/verificar-rls.mjs",
```

- [ ] **Step 3: Rodar**

Run: `npm run verificar:rls`
Expected: lista as 11 tabelas com "ok: ... (RLS + policy)" e termina em "RLS OK (11 tabelas)".

- [ ] **Step 4: Commit**

```bash
git add scripts/verificar-rls.mjs package.json
git commit -m "feat: verificar-rls (auditoria de RLS lendo as migrations) + npm script"
```

---

### Task 3: CSV protegido contra injeção de fórmula

**Files:**
- Create: `src/lib/relatorio/csv.ts`, `tests/csv.test.ts`
- Modify: `src/app/painel/relatorios/csv/route.ts`

- [ ] **Step 1: Teste (falha primeiro)**

Create `tests/csv.test.ts`:
```ts
import { protegerCelulaCSV } from "@/lib/relatorio/csv";

test("protegerCelulaCSV prefixa formulas e mantem texto normal", () => {
  expect(protegerCelulaCSV("=1+1")).toBe("'=1+1");
  expect(protegerCelulaCSV("+55 11")).toBe("'+55 11");
  expect(protegerCelulaCSV("-5")).toBe("'-5");
  expect(protegerCelulaCSV("@cmd")).toBe("'@cmd");
  expect(protegerCelulaCSV("Venda normal")).toBe("Venda normal");
  expect(protegerCelulaCSV("")).toBe("");
});
```

- [ ] **Step 2: Rodar (deve falhar)**

Run: `npm test -- csv`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

Create `src/lib/relatorio/csv.ts`:
```ts
// Neutraliza injecao de formula: Excel/Sheets tratam celulas iniciadas por
// = + - @ (ou tab/CR) como formula. Prefixar com ' (aspa simples) desativa isso.
export function protegerCelulaCSV(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}
```

- [ ] **Step 4: Rodar (deve passar)**

Run: `npm test -- csv`
Expected: PASS.

- [ ] **Step 5: Aplicar na rota**

Modify `src/app/painel/relatorios/csv/route.ts`:
1. Importar: `import { protegerCelulaCSV } from "@/lib/relatorio/csv";`
2. Na montagem da linha, proteger a `descricao` (campo de texto do usuário) ANTES do escape de aspas. Trocar:
```ts
    const desc = `"${String(l.descricao).replace(/"/g, '""')}"`;
```
por:
```ts
    const desc = `"${protegerCelulaCSV(String(l.descricao)).replace(/"/g, '""')}"`;
```

- [ ] **Step 6: Build + testes**

Run: `npm run build` e `npm test` → verdes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/relatorio/csv.ts tests/csv.test.ts src/app/painel/relatorios/csv/route.ts
git commit -m "feat: CSV protegido contra injecao de formula (protegerCelulaCSV)"
```

---

### Task 4: Checklist de deploy (doc)

**Files:**
- Create: `docs/deploy-checklist.md`

- [ ] **Step 1: Documento**

Create `docs/deploy-checklist.md`:
```markdown
# Checklist de Deploy — Autchronos

Roteiro dos passos manuais para subir para produção (Vercel + Supabase Cloud).

## 1. Segurança (fazer ANTES de expor)
- [ ] **Rotacionar a `service_role`** no Supabase (Settings → API → Reset). A chave antiga foi colada no chat durante o desenvolvimento.
- [ ] Atualizar `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e nas env vars da Vercel.
- [ ] Confirmar que só a **anon key** e a **URL** são `NEXT_PUBLIC_*` (a service_role NÃO pode ter prefixo público).
- [ ] Rodar `npm run verificar:rls` → "RLS OK".

## 2. Supabase (Cloud)
- [ ] Confirmar as 10 migrations aplicadas (0001–0010).
- [ ] `node scripts/verificar-banco.mjs` e `node scripts/verificar-resumo.mjs` → verdes.
- [ ] Auth → URL Configuration: adicionar a URL de produção em **Site URL** e **Redirect URLs** (`https://SEU-DOMINIO/auth/callback`).

## 3. Vercel
- [ ] Importar o repositório, framework Next.js.
- [ ] Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Deploy. Conferir o build de produção sem erro.

## 4. Google OAuth (lembrete)
- [ ] Google Cloud Console → OAuth 2.0 Client: adicionar a URL de produção como Authorized redirect URI (a callback do Supabase).
- [ ] Colar Client ID/Secret no Supabase → Auth → Providers → Google, e ativar.
- [ ] Testar login com Google em produção.

## 5. PWA
- [ ] Abrir o domínio (HTTPS) no celular; conferir manifest, ícones e o prompt de "instalar".
- [ ] Confirmar que o service worker registra e o app abre offline (shell).

## 6. Pós-deploy (smoke)
- [ ] `/` e `/entrar` carregam (200).
- [ ] `/painel` deslogado redireciona para `/entrar`.
- [ ] Cadastro real → confirmar e-mail → login → criar negócio → onboarding → painel.
- [ ] Um lançamento de teste aparece no dashboard.
```

- [ ] **Step 2: Commit**

```bash
git add docs/deploy-checklist.md
git commit -m "docs: checklist de deploy (seguranca, Vercel, Supabase, Google OAuth, PWA)"
```

---

## Self-Review (cobertura da spec)

- **Telas erro/loading/404/global-error institucionais** → Task 1. ✓
- **Auditoria de RLS (lê migrations, guardião de regressão) + npm script** → Task 2. ✓
- **CSV anti-injeção (protegerCelulaCSV, testado, aplicado na rota)** → Task 3. ✓
- **Checklist de deploy (rotacionar chave, Vercel, Supabase, Google OAuth, PWA, smoke)** → Task 4. ✓
- **Sem migration; tokens institucionais; sem opacidade em token var** → respeitado. ✓
