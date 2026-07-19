# Autchronos Fase 2 (Auth + Onboarding + Banco) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Autenticação (e-mail/senha + Google) via Supabase, onboarding em etapas que cria o negócio e semeia dados de exemplo, e o banco Cloud com as migrations aplicadas (incluindo os deltas de domínio) — deixando um placeholder de área logada pronto para a Fase 3.

**Architecture:** `@supabase/ssr` com sessão em cookies (browser client, server client, admin client, middleware). Middleware protege `/onboarding` e `/painel`. Onboarding chama a RPC `criar_negocio` e depois semeia telefone + templates de ramo + saldo inicial sob RLS. Migration `0005` adiciona colunas de domínio e atualiza o trigger para lançar valor líquido.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind · `@supabase/ssr` + `@supabase/supabase-js` · Supabase (Postgres + Auth + RLS) · Vitest.

## Global Constraints

- **Idioma:** interface 100% pt-BR. **Moeda:** R$ `1.234,56` (já há `formatarBRL`).
- **Design:** "Institucional Clássico", tema claro padrão; tokens semânticos já existem (`marca`, `superficie`, `borda`, `texto`, `entrada`, `saida`, `dourado`).
- **Supabase via `@supabase/ssr`** (cookies). **Next 14: `cookies()` é SÍNCRONO** (não usar `await` nele).
- **Env vars** (`.env.local`, git-ignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  - URL do projeto: `https://trpjotkzjttwtyesmqyq.supabase.co`
  - Anon key (JWT legado, `role: anon`): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycGpvdGt6anR0d3R5ZXNtcXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzcwODcsImV4cCI6MjA5OTQ1MzA4N30.b_01l5hnFb-48zDca1sERdSWR0EgvzJyvAwljthjc90`
  - `SUPABASE_SERVICE_ROLE_KEY`: a `service_role` (JWT legado, par da anon acima) — o usuário cola no `.env.local` (secreta; nunca versionar).
- **Isolamento por `negocio_id`** via RLS/`e_membro`. O vínculo `negocio_usuarios` só nasce pela RPC `criar_negocio` (SECURITY DEFINER). Após isso, o membro insere nas demais tabelas sob RLS.
- **Sem tabela `profiles`.** Nicho = `negocios.ramo`; limite de pró-labore = `metas.limite_prolabore`; identidade = `auth.users`.
- **Retirada** = `lancamentos` com `tipo='saida'`, `carteira='empresa'`, `eh_retirada=true`.
- **Rotas protegidas:** `/onboarding`, `/painel`. `/` e `/entrar` são públicas.
- **Alias `@/*` → `./src/*`.**

---

## Estrutura de arquivos (Fase 2)

```
.env.local (não versionado), .env.local.example
middleware.ts
supabase/migrations/0005_deltas_fase_dominio.sql
src/lib/supabase/cliente.ts        # browser client
src/lib/supabase/servidor.ts       # server client (cookies)
src/lib/supabase/admin.ts          # service_role (server-only)
src/lib/supabase/middleware.ts     # atualizarSessao + ehRotaProtegida
src/lib/auth/validaLogin.ts        # validação pura de e-mail/senha
src/lib/auth/roteamento.ts         # destinoPosLogin + nichoParaRamo
src/templates/ramos.ts             # templates de categorias/itens por ramo
src/app/entrar/page.tsx            # login + cadastro + Google (substitui o stub)
src/components/auth/FormularioAcesso.tsx
src/components/auth/BotaoGoogle.tsx
src/app/auth/callback/route.ts     # troca code -> sessão
src/app/onboarding/page.tsx        # wizard
src/components/onboarding/*         # etapas
src/app/onboarding/acoes.ts        # server action criarNegocioCompleto
src/app/painel/page.tsx            # placeholder área logada
src/app/painel/acoes.ts            # server action de logout
scripts/verificar-banco.mjs        # checagem do schema/trigger (usa service_role)
tests/rota-protegida.test.ts, tests/validaLogin.test.ts,
tests/ramos.test.ts, tests/roteamento.test.ts
```

---

### Task 1: Dependências, env e camada Supabase (clients + middleware)

**Files:**
- Create: `.env.local`, `.env.local.example`
- Create: `src/lib/supabase/cliente.ts`, `servidor.ts`, `admin.ts`, `rotas.ts`, `middleware.ts`
- Create: `middleware.ts` (raiz)
- Test: `tests/rota-protegida.test.ts`

**Interfaces:**
- Produces:
  - `criarClienteBrowser()` → SupabaseClient (browser)
  - `criarClienteServidor()` → SupabaseClient (server, cookies)
  - `criarClienteAdmin()` → SupabaseClient (service_role)
  - `ehRotaProtegida(pathname: string): boolean` (módulo PURO `rotas.ts`, sem imports do Next — por isso é testável no Vitest)
  - `atualizarSessao(request: NextRequest): Promise<NextResponse>`

- [ ] **Step 1: Instalar dependências**

Run:
```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: Criar `.env.local` e `.env.local.example`**

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://trpjotkzjttwtyesmqyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycGpvdGt6anR0d3R5ZXNtcXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzcwODcsImV4cCI6MjA5OTQ1MzA4N30.b_01l5hnFb-48zDca1sERdSWR0EgvzJyvAwljthjc90
# Cole aqui a chave secreta service_role (JWT legado) do projeto Supabase.
# Supabase Dashboard -> Project Settings -> API -> service_role (Reveal).
# NUNCA versionar este arquivo. Necessária para migrations e para o webhook.
SUPABASE_SERVICE_ROLE_KEY=
```

Create `.env.local.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

(`.env*.local` já está no `.gitignore`.)

- [ ] **Step 3: Client de browser**

Create `src/lib/supabase/cliente.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Client de servidor (cookies)**

Create `src/lib/supabase/servidor.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Next 14: cookies() é síncrono.
export function criarClienteServidor() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Em Server Components a escrita de cookie lança; ignoramos porque o
          // middleware já renova a sessão. Em actions/route handlers funciona.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // no-op
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Client admin (service_role)**

Create `src/lib/supabase/admin.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

// SOMENTE servidor. Ignora RLS — usar com parcimônia. Nunca importar em client component.
export function criarClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

- [ ] **Step 6: Escrever o teste de `ehRotaProtegida` (falha primeiro)**

Create `tests/rota-protegida.test.ts`:
```ts
import { ehRotaProtegida } from "@/lib/supabase/rotas";

test("/onboarding e /painel são protegidas", () => {
  expect(ehRotaProtegida("/onboarding")).toBe(true);
  expect(ehRotaProtegida("/painel")).toBe(true);
  expect(ehRotaProtegida("/painel/qualquer")).toBe(true);
});

test("/, /entrar e /auth/callback são públicas", () => {
  expect(ehRotaProtegida("/")).toBe(false);
  expect(ehRotaProtegida("/entrar")).toBe(false);
  expect(ehRotaProtegida("/auth/callback")).toBe(false);
});
```

- [ ] **Step 7: Rodar para confirmar a falha**

Run: `npm test -- rota-protegida`
Expected: FAIL com "Cannot find module '@/lib/supabase/rotas'".

- [ ] **Step 8: Implementar o módulo puro de rotas**

Create `src/lib/supabase/rotas.ts`:
```ts
// Puro (sem imports do Next), para ser testável no Vitest e reusado no middleware.
const ROTAS_PROTEGIDAS = ["/onboarding", "/painel"];

export function ehRotaProtegida(pathname: string): boolean {
  return ROTAS_PROTEGIDAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}
```

- [ ] **Step 9: Rodar para confirmar verde**

Run: `npm test -- rota-protegida`
Expected: PASS (2 testes).

- [ ] **Step 10: Implementar o middleware helper**

Create `src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ehRotaProtegida } from "@/lib/supabase/rotas";

export async function atualizarSessao(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && ehRotaProtegida(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 11: Criar o `middleware.ts` da raiz**

Create `middleware.ts`:
```ts
import { type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|apple-icon).*)",
  ],
};
```

- [ ] **Step 12: Build e commit**

Run: `npm run build`
Expected: sucesso (se travar no 1º com erro nativo Windows `0xC0000409`, rodar de novo).

Run: `npm test`
Expected: todos verdes.

```bash
git add -A
git commit -m "feat: camada Supabase (ssr clients + middleware) e env da Fase 2"
```

---

### Task 2: Migration 0005 (deltas) + aplicação + verificação do banco

**Files:**
- Create: `supabase/migrations/0005_deltas_fase_dominio.sql`
- Create: `scripts/verificar-banco.mjs`

**Interfaces:**
- Produces: schema Cloud com as colunas novas e o trigger de valor líquido aplicados; script de verificação.

**Pré-requisito:** `SUPABASE_SERVICE_ROLE_KEY` precisa estar preenchida no `.env.local`. Se estiver vazia, reporte **BLOCKED** pedindo a chave.

- [ ] **Step 1: Criar a migration 0005**

Create `supabase/migrations/0005_deltas_fase_dominio.sql`:
```sql
-- ============================================================
-- Deltas da fase de domínio (aplicados já na Fase 2 — princípio D1):
-- carteira PF/PJ + retirada, metas de pró-labore/reserva, taxa no a receber,
-- e o trigger passando a lançar o valor LÍQUIDO no caixa.
-- ============================================================

-- ---------- lancamentos: carteira e retirada ----------
ALTER TABLE lancamentos
  ADD COLUMN carteira TEXT NOT NULL DEFAULT 'empresa'
    CHECK (carteira IN ('empresa','pessoal')),
  ADD COLUMN eh_retirada BOOLEAN NOT NULL DEFAULT false;

-- Retirada = tipo='saida', carteira='empresa', eh_retirada=true (não é despesa
-- do negócio). Índice para a tela "Minhas retiradas".
CREATE INDEX idx_lancamentos_retiradas
  ON lancamentos (negocio_id, data DESC) WHERE eh_retirada;

-- ---------- metas: pró-labore e reserva ----------
ALTER TABLE metas
  ADD COLUMN limite_prolabore NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN reserva_alvo     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN reserva_prazo    DATE,
  ADD COLUMN valor_reservado  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN saldo_minimo     NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ---------- receber: forma de pagamento e taxa ----------
ALTER TABLE receber
  ADD COLUMN forma_pagamento TEXT,
  ADD COLUMN taxa            NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ---------- trigger: lançar o LÍQUIDO (descontada a taxa) ----------
-- Substitui a versão do 0003. Mantém idempotência e o fuso America/Sao_Paulo.
CREATE OR REPLACE FUNCTION sync_receber_lancamento() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pago AND NOT OLD.pago THEN
    INSERT INTO lancamentos (negocio_id, tipo, descricao, valor, data, receber_id)
    VALUES (
      NEW.negocio_id,
      'entrada',
      NEW.descricao,
      ROUND(NEW.valor * (1 - COALESCE(NEW.taxa, 0) / 100), 2),
      (now() AT TIME ZONE 'America/Sao_Paulo')::date,
      NEW.id
    );
  ELSIF NOT NEW.pago AND OLD.pago THEN
    DELETE FROM lancamentos WHERE receber_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

- [ ] **Step 2: Aplicar TODAS as migrations no projeto Cloud**

O projeto Cloud está vazio; aplique `0001` → `0005` em ordem. Escolha um caminho:

**Caminho A — Supabase SQL Editor (sem CLI):** no dashboard do projeto → SQL Editor, cole e rode o conteúdo de cada arquivo `supabase/migrations/0001_...` até `0005_...`, em ordem.

**Caminho B — Supabase CLI:**
```bash
npx supabase login
npx supabase link --project-ref trpjotkzjttwtyesmqyq
npx supabase db push
```

Registre no relatório qual caminho foi usado e a saída.

- [ ] **Step 3: Escrever o script de verificação do banco**

Create `scripts/verificar-banco.mjs`:
```js
// Verifica, com a service_role, que os deltas do 0005 estão aplicados e que o
// trigger lança o valor líquido. Cria dados temporários e os remove no fim.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// carrega .env.local de forma simples
for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

// 1) colunas novas existem (insere linha com carteira/eh_retirada)
const { data: neg } = await sb
  .from("negocios")
  .insert({ nome: "VERIF_TMP", ramo: "outro" })
  .select()
  .single();
assert(neg?.id, "criou negócio temporário");

const { error: eLanc } = await sb.from("lancamentos").insert({
  negocio_id: neg.id,
  tipo: "saida",
  descricao: "retirada teste",
  valor: 100,
  carteira: "empresa",
  eh_retirada: true,
});
assert(!eLanc, "lancamentos aceita carteira + eh_retirada");

// 2) trigger líquido: receber com taxa 10% -> caixa recebe 90
const { data: cli } = await sb
  .from("clientes")
  .insert({ negocio_id: neg.id, nome: "Cliente teste" })
  .select()
  .single();
const { data: rec } = await sb
  .from("receber")
  .insert({
    negocio_id: neg.id,
    cliente_id: cli.id,
    descricao: "venda cartão",
    valor: 100,
    taxa: 10,
  })
  .select()
  .single();
await sb.from("receber").update({ pago: true }).eq("id", rec.id);
const { data: lanc } = await sb
  .from("lancamentos")
  .select("valor")
  .eq("receber_id", rec.id)
  .single();
assert(Number(lanc.valor) === 90, `trigger lançou líquido 90 (veio ${lanc?.valor})`);

// limpeza (cascata por negocio_id)
await sb.from("negocios").delete().eq("id", neg.id);
console.log("VERIFICAÇÃO OK");
```

- [ ] **Step 4: Rodar a verificação**

Run:
```bash
node scripts/verificar-banco.mjs
```
Expected: imprime vários `ok:` e termina com `VERIFICAÇÃO OK`. Se falhar por chave ausente, isso é BLOCKED até a `service_role` entrar no `.env.local`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_deltas_fase_dominio.sql scripts/verificar-banco.mjs
git commit -m "feat: migration 0005 (carteira/retirada/taxa/reserva) + verificacao de banco"
```

---

### Task 3: Autenticação — validação, `/entrar`, callback e logout

**Files:**
- Create: `src/lib/auth/validaLogin.ts`
- Create: `src/components/auth/FormularioAcesso.tsx`, `src/components/auth/BotaoGoogle.tsx`
- Modify: `src/app/entrar/page.tsx` (substitui o stub)
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/painel/acoes.ts` (logout, usado também no painel da Task 4)
- Test: `tests/validaLogin.test.ts`

**Interfaces:**
- Consumes: `criarClienteBrowser` (Task 1), `criarClienteServidor` (Task 1).
- Produces:
  - `validarEmail(email: string): boolean`
  - `validarSenha(senha: string): { ok: boolean; erro?: string }`
  - `<FormularioAcesso />`, `<BotaoGoogle />`
  - Route handler `GET /auth/callback`
  - Server action `sair()`

- [ ] **Step 1: Escrever os testes de validação (falha primeiro)**

Create `tests/validaLogin.test.ts`:
```ts
import { validarEmail, validarSenha } from "@/lib/auth/validaLogin";

test("e-mail válido e inválido", () => {
  expect(validarEmail("ana@loja.com")).toBe(true);
  expect(validarEmail("ana@")).toBe(false);
  expect(validarEmail("sem-arroba")).toBe(false);
});

test("senha exige mínimo de 6 caracteres", () => {
  expect(validarSenha("123456").ok).toBe(true);
  expect(validarSenha("123").ok).toBe(false);
  expect(validarSenha("123").erro).toMatch(/6/);
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- validaLogin`
Expected: FAIL com "Cannot find module '@/lib/auth/validaLogin'".

- [ ] **Step 3: Implementar `validaLogin.ts`**

Create `src/lib/auth/validaLogin.ts`:
```ts
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validarSenha(senha: string): { ok: boolean; erro?: string } {
  if (senha.length < 6) {
    return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- validaLogin`
Expected: PASS (2 testes).

- [ ] **Step 5: Botão do Google**

Create `src/components/auth/BotaoGoogle.tsx`:
```tsx
"use client";
import { criarClienteBrowser } from "@/lib/supabase/cliente";

export function BotaoGoogle() {
  async function entrarComGoogle() {
    const supabase = criarClienteBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      type="button"
      onClick={entrarComGoogle}
      className="w-full rounded-md border border-borda bg-superficie px-4 py-2 font-medium text-texto transition-colors hover:bg-fundo"
    >
      Entrar com Google
    </button>
  );
}
```

- [ ] **Step 6: Formulário de acesso (login + cadastro)**

Create `src/components/auth/FormularioAcesso.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import { validarEmail, validarSenha } from "@/lib/auth/validaLogin";

type Modo = "entrar" | "cadastrar";

export function FormularioAcesso() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    if (!validarEmail(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    const v = validarSenha(senha);
    if (!v.ok) {
      setErro(v.erro!);
      return;
    }

    setCarregando(true);
    const supabase = criarClienteBrowser();

    if (modo === "cadastrar") {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setCarregando(false);
      if (error) {
        setErro(error.message);
        return;
      }
      setAviso("Enviamos um e-mail de confirmação. Confirme para entrar.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.push("/painel");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex rounded-md border border-borda p-1 text-sm">
        <button
          type="button"
          onClick={() => setModo("entrar")}
          className={`flex-1 rounded px-3 py-1.5 ${modo === "entrar" ? "bg-marca text-white" : "text-texto-suave"}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setModo("cadastrar")}
          className={`flex-1 rounded px-3 py-1.5 ${modo === "cadastrar" ? "bg-marca text-white" : "text-texto-suave"}`}
        >
          Criar conta
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-borda bg-superficie px-3 py-2 text-texto"
          autoComplete="email"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="rounded-md border border-borda bg-superficie px-3 py-2 text-texto"
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
        />
      </label>

      {erro && <p className="text-sm text-saida">{erro}</p>}
      {aviso && <p className="text-sm text-entrada">{aviso}</p>}

      <button
        type="submit"
        disabled={carregando}
        className="rounded-md bg-marca px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Página `/entrar` (substitui o stub)**

Modify `src/app/entrar/page.tsx` — substitua o arquivo inteiro por:
```tsx
import Link from "next/link";
import { FormularioAcesso } from "@/components/auth/FormularioAcesso";
import { BotaoGoogle } from "@/components/auth/BotaoGoogle";

export default function Entrar() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Link href="/" className="font-serif text-2xl font-bold text-marca">
          Autchronos
        </Link>
        <p className="mt-1 text-sm text-texto-suave">Meu Gestor Financeiro</p>
      </div>

      <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sm">
        <FormularioAcesso />
        <div className="my-4 flex items-center gap-3 text-xs text-texto-suave">
          <span className="h-px flex-1 bg-borda" />ou<span className="h-px flex-1 bg-borda" />
        </div>
        <BotaoGoogle />
      </div>

      <Link href="/" className="text-center text-sm text-marca underline">
        Voltar para o início
      </Link>
    </main>
  );
}
```

- [ ] **Step 8: Route handler do callback**

Create `src/app/auth/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = criarClienteServidor();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Após autenticar, o /painel decide se manda para o onboarding.
  return NextResponse.redirect(`${origin}/painel`);
}
```

- [ ] **Step 9: Server action de logout**

Create `src/app/painel/acoes.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function sair() {
  const supabase = criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
```

- [ ] **Step 10: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`).
Expected: compila `/entrar` e `/auth/callback`.

Run: `npm test`
Expected: verde.

```bash
git add -A
git commit -m "feat: auth e-mail/senha + Google, callback e logout"
```

---

### Task 4: Onboarding — templates, roteamento, wizard, ação e `/painel`

**Files:**
- Create: `src/templates/ramos.ts`
- Create: `src/lib/auth/roteamento.ts`
- Create: `src/app/onboarding/page.tsx`, `src/app/onboarding/Wizard.tsx`, `src/app/onboarding/acoes.ts`
- Create: `src/app/painel/page.tsx`
- Test: `tests/ramos.test.ts`, `tests/roteamento.test.ts`

**Interfaces:**
- Consumes: `criarClienteServidor` (Task 1), `sair` (Task 3).
- Produces:
  - `TEMPLATES` e `templateDoRamo(ramo: Ramo)`
  - `nichoParaRamo(nicho: string): Ramo` e o tipo `Ramo`
  - Server action `criarNegocioCompleto(dados)`

- [ ] **Step 1: Escrever os testes de templates e roteamento (falha primeiro)**

Create `tests/ramos.test.ts`:
```ts
import { templateDoRamo } from "@/templates/ramos";

test("cada ramo tem categorias e itens de exemplo", () => {
  for (const ramo of ["alimentacao", "revenda", "locacao", "servicos", "outro"] as const) {
    const t = templateDoRamo(ramo);
    expect(t.categorias.length).toBeGreaterThan(0);
    expect(Array.isArray(t.itens)).toBe(true);
  }
});

test("categorias têm tipo entrada ou saida", () => {
  for (const c of templateDoRamo("alimentacao").categorias) {
    expect(["entrada", "saida"]).toContain(c.tipo);
  }
});
```

Create `tests/roteamento.test.ts`:
```ts
import { nichoParaRamo } from "@/lib/auth/roteamento";

test("nicho da UI mapeia para o ramo do schema", () => {
  expect(nichoParaRamo("Vendas de produtos")).toBe("revenda");
  expect(nichoParaRamo("Alimentação")).toBe("alimentacao");
  expect(nichoParaRamo("Aluguéis")).toBe("locacao");
  expect(nichoParaRamo("Serviços")).toBe("servicos");
  expect(nichoParaRamo("Outro")).toBe("outro");
  expect(nichoParaRamo("qualquer coisa")).toBe("outro");
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- ramos roteamento`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar `roteamento.ts`**

Create `src/lib/auth/roteamento.ts`:
```ts
export type Ramo =
  | "alimentacao"
  | "beleza"
  | "revenda"
  | "servicos"
  | "locacao"
  | "outro";

const NICHO_RAMO: Record<string, Ramo> = {
  "Vendas de produtos": "revenda",
  "Alimentação": "alimentacao",
  "Aluguéis": "locacao",
  "Serviços": "servicos",
  "Outro": "outro",
};

export function nichoParaRamo(nicho: string): Ramo {
  return NICHO_RAMO[nicho] ?? "outro";
}
```

- [ ] **Step 4: Implementar `templates/ramos.ts`**

Create `src/templates/ramos.ts`:
```ts
import type { Ramo } from "@/lib/auth/roteamento";

export interface CategoriaTemplate {
  nome: string;
  tipo: "entrada" | "saida";
}
export interface ItemTemplate {
  nome: string;
  preco: number;
  unidade: string;
  tipo: "venda" | "aluguel";
  controla_estoque: boolean;
  estoque: number;
}
export interface RamoTemplate {
  categorias: CategoriaTemplate[];
  itens: ItemTemplate[];
}

const SAIDAS_COMUNS: CategoriaTemplate[] = [
  { nome: "Fornecedores", tipo: "saida" },
  { nome: "Contas fixas", tipo: "saida" },
];

export const TEMPLATES: Record<Ramo, RamoTemplate> = {
  alimentacao: {
    categorias: [{ nome: "Vendas", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Açaí 300ml", preco: 15, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
      { nome: "Açaí 500ml", preco: 20, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
    ],
  },
  revenda: {
    categorias: [{ nome: "Vendas", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Produto exemplo", preco: 50, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
    ],
  },
  beleza: {
    categorias: [{ nome: "Serviços", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Esmalte", preco: 8, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
    ],
  },
  locacao: {
    categorias: [{ nome: "Aluguéis", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Item para locação", preco: 100, unidade: "un", tipo: "aluguel", controla_estoque: true, estoque: 1 },
    ],
  },
  servicos: {
    categorias: [{ nome: "Serviços", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [],
  },
  outro: {
    categorias: [{ nome: "Vendas", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [],
  },
};

export function templateDoRamo(ramo: Ramo): RamoTemplate {
  return TEMPLATES[ramo];
}
```

- [ ] **Step 5: Rodar para confirmar verde**

Run: `npm test -- ramos roteamento`
Expected: PASS.

- [ ] **Step 6: Server action `criarNegocioCompleto`**

Create `src/app/onboarding/acoes.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { nichoParaRamo } from "@/lib/auth/roteamento";
import { templateDoRamo } from "@/templates/ramos";

export interface DadosOnboarding {
  nomeNegocio: string;
  nicho: string;
  whatsapp: string;
  saldoInicial: number;
}

export async function criarNegocioCompleto(dados: DadosOnboarding) {
  const supabase = criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const ramo = nichoParaRamo(dados.nicho);

  // 1) RPC cria negócio + vínculo dono + metas, e retorna o id.
  const { data: negocioId, error: eRpc } = await supabase.rpc("criar_negocio", {
    p_nome: dados.nomeNegocio,
    p_ramo: ramo,
  });
  if (eRpc || !negocioId) {
    return { erro: eRpc?.message ?? "Não foi possível criar o negócio." };
  }

  // 2) Seeding sob RLS (o usuário já é membro).
  const template = templateDoRamo(ramo);

  if (dados.whatsapp.trim()) {
    await supabase.from("negocio_telefones").insert({
      negocio_id: negocioId,
      telefone: dados.whatsapp.trim(),
    });
  }

  if (template.categorias.length) {
    await supabase
      .from("categorias")
      .insert(template.categorias.map((c) => ({ ...c, negocio_id: negocioId })));
  }

  if (template.itens.length) {
    await supabase
      .from("itens")
      .insert(template.itens.map((i) => ({ ...i, negocio_id: negocioId })));
  }

  if (dados.saldoInicial > 0) {
    await supabase.from("lancamentos").insert({
      negocio_id: negocioId,
      tipo: "entrada",
      descricao: "Saldo inicial",
      valor: dados.saldoInicial,
      carteira: "empresa",
    });
  }

  redirect("/painel");
}
```

- [ ] **Step 7: Wizard do onboarding (client component)**

Create `src/app/onboarding/Wizard.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { criarNegocioCompleto } from "@/app/onboarding/acoes";

const NICHOS = ["Vendas de produtos", "Alimentação", "Aluguéis", "Serviços", "Outro"];

export function Wizard() {
  const [etapa, setEtapa] = useState(0);
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nicho, setNicho] = useState(NICHOS[0]);
  const [whatsapp, setWhatsapp] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

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
        whatsapp,
        saldoInicial: Number(saldoInicial.replace(",", ".")) || 0,
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  const campo =
    "w-full rounded-md border border-borda bg-superficie px-3 py-2 text-texto";
  const botao =
    "rounded-md bg-marca px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-texto-suave">Etapa {etapa + 1} de 4</p>

      {etapa === 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Nome do negócio
          <input className={campo} value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} />
        </label>
      )}

      {etapa === 1 && (
        <label className="flex flex-col gap-1 text-sm">
          Nicho do negócio
          <select className={campo} value={nicho} onChange={(e) => setNicho(e.target.value)}>
            {NICHOS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      {etapa === 2 && (
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp para lançamentos (com DDD)
          <input className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
        </label>
      )}

      {etapa === 3 && (
        <label className="flex flex-col gap-1 text-sm">
          Saldo inicial em caixa (opcional)
          <input className={campo} value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>
      )}

      {erro && <p className="text-sm text-saida">{erro}</p>}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setEtapa((e) => Math.max(0, e - 1))}
          disabled={etapa === 0 || pendente}
          className="rounded-md border border-borda px-4 py-2 text-texto-suave disabled:opacity-40"
        >
          Voltar
        </button>
        {etapa < 3 ? (
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

- [ ] **Step 8: Página `/onboarding`**

Create `src/app/onboarding/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Wizard } from "@/app/onboarding/Wizard";

export default async function Onboarding() {
  const supabase = criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Se já tem negócio, não refaz o onboarding.
  const { data: vinculo } = await supabase
    .from("negocio_usuarios")
    .select("negocio_id")
    .limit(1)
    .maybeSingle();
  if (vinculo) redirect("/painel");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold text-marca">Bem-vindo!</h1>
        <p className="mt-1 text-sm text-texto-suave">Vamos configurar seu negócio.</p>
      </div>
      <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sm">
        <Wizard />
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Página `/painel` (placeholder da área logada)**

Create `src/app/painel/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { sair } from "@/app/painel/acoes";

export default async function Painel() {
  const supabase = criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nome")
    .limit(1)
    .maybeSingle();

  // Sem negócio ainda -> onboarding.
  if (!negocio) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between border-b border-borda pb-4">
        <div>
          <p className="font-serif text-xl font-bold text-marca">{negocio.nome}</p>
          <p className="text-sm text-texto-suave">{user.email}</p>
        </div>
        <form action={sair}>
          <button type="submit" className="rounded-md border border-borda px-3 py-1.5 text-sm text-texto-suave hover:text-texto">
            Sair
          </button>
        </form>
      </header>
      <div className="rounded-xl border border-borda bg-superficie p-6">
        <p className="text-texto">
          Conta e negócio configurados. O painel financeiro completo chega na Fase 3.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 10: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`).
Expected: compila `/onboarding` e `/painel`.

Run: `npm test`
Expected: todos verdes.

```bash
git add -A
git commit -m "feat: onboarding (templates de ramo + criar_negocio) e placeholder do painel"
```

- [ ] **Step 11: Verificação manual do fluxo (depois das chaves e do Google configurados)**

Com `.env.local` completo e a migration aplicada:
1. `npm run dev` → `/entrar` → criar conta → confirmar e-mail → cai em `/onboarding`.
2. Preencher as 4 etapas → concluir → cai em `/painel` com o nome do negócio.
3. No Supabase, conferir `negocios`, `negocio_usuarios`, `negocio_telefones`, `categorias`, `itens` e (se saldo>0) `lancamentos`.
4. Testar login Google. Testar duas contas → cada uma só vê o próprio negócio (isolamento RLS).

Registrar o resultado. (Esta verificação é manual; não bloqueia os commits de código.)

---

## Self-Review (cobertura da spec)

- **@supabase/ssr: clients browser/server/admin + middleware** → Task 1. ✓
- **Env vars + .env.local(.example)** → Task 1. ✓
- **Proteção de rotas (/onboarding, /painel)** → Task 1 (middleware + `ehRotaProtegida`). ✓
- **Migration 0005 (carteira/eh_retirada, metas reserva/pró-labore, receber taxa) + trigger líquido** → Task 2. ✓
- **Aplicar migrations no Cloud + verificação** → Task 2. ✓
- **Sem tabela profiles** → não há criação de `profiles` em lugar nenhum. ✓
- **Auth e-mail/senha + Google + callback + logout** → Task 3. ✓
- **Validação pura testada** → Task 3. ✓
- **Onboarding em 4 etapas + criar_negocio + seeding client-side (telefone, templates, saldo)** → Task 4. ✓
- **Templates de ramo como dado (D5) + nicho→ramo** → Task 4 (`templates/ramos.ts`, `roteamento.ts`). ✓
- **Roteamento membro→painel / não-membro→onboarding** → Task 4 (redirects nas páginas server `/painel` e `/onboarding`). ✓
- **/painel placeholder** → Task 4. ✓

Fora de escopo (correto): dashboard/lançamentos CRUD, carteiras/retiradas/receber/metas na UI, estoque, WhatsApp.

Dependências externas (não-código): `service_role` no `.env.local`, aplicação das migrations no Cloud, credenciais Google OAuth no Supabase. Sinalizadas nas Tasks 2 e 3/4 e na verificação manual.
