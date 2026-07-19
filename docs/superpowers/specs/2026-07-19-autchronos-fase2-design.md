# Autchronos — Fase 2 (Auth + Onboarding + Banco) · Design

**Data:** 19/07/2026
**Base:** design geral (`2026-07-18-autchronos-nextjs-design.md`), schema
`supabase/migrations/0001..0004`, plano D1–D7 (`PLANO-DE-ACAO-APP-MEI.txt`).
Continua a partir da Fase 1 (landing + PWA), já integrada no `master`.

Decisões confirmadas com o usuário nesta rodada:
- **Supabase Cloud novo**, criado pelo usuário; ele envia Project URL + anon key,
  e coloca a `service_role` direto no `.env.local` (secreta, não vai ao chat).
- **E-mail/senha + Google** já nesta fase.
- **Aplicar os deltas de schema agora** (migration `0005`).
- **Sem tabela `profiles`**; **retirada = flag + carteira**; **seeding dos
  templates no cliente** após a RPC.

---

## 1. Camada Supabase no Next.js (`@supabase/ssr`)

Sessão baseada em cookies, compatível com Server Components, middleware e Route
Handlers (prepara o webhook da Fase 6).

Arquivos:
- `src/lib/supabase/cliente.ts` — `createBrowserClient` (client components).
- `src/lib/supabase/servidor.ts` — `createServerClient` lendo/escrevendo cookies
  via `next/headers` (server components, server actions, route handlers).
- `src/lib/supabase/admin.ts` — cliente com `service_role`, **somente servidor**
  (uso mínimo, ignora RLS; nunca importado em client component).
- `src/lib/supabase/middleware.ts` — helper `atualizarSessao(request)` que
  renova o token e devolve a `NextResponse`.
- `middleware.ts` (raiz) — chama `atualizarSessao` e protege rotas privadas:
  sem sessão em `/onboarding` ou `/painel` → redireciona para `/entrar`.

Variáveis de ambiente (`.env.local`, git-ignored; criar `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Autenticação

### Rotas
- `/entrar` — login e cadastro por e-mail/senha (alternância numa mesma tela) +
  botão **"Entrar com Google"**. Visual institucional (claro padrão).
- `/auth/callback` — Route Handler que troca o `code` pela sessão
  (`exchangeCodeForSession`, fluxo PKCE do `@supabase/ssr`). Destino do OAuth do
  Google e do link de confirmação de e-mail.
- Logout via server action (`signOut`).

### Fluxos
- **E-mail/senha:** `signUp` / `signInWithPassword`. O Supabase, por padrão, exige
  **confirmação de e-mail**: após o cadastro, mostrar tela "verifique seu e-mail".
  O link de confirmação aponta para `/auth/callback` → estabelece sessão →
  roteamento (seção 3). *Nota de dev:* para acelerar os testes locais, o usuário
  pode desligar "Confirm email" em Supabase → Auth; em produção fica ligado.
- **Google:** `signInWithOAuth({ provider: 'google', options: { redirectTo:
  <origin>/auth/callback } })`.

### Validação
- Reaproveitar o utilitário puro de validação de login (regras de e-mail/senha),
  testável com Vitest.

---

## 3. Onboarding + roteamento pós-login

### Roteamento
Helper de servidor `negocioDoUsuario()`: consulta se o usuário autenticado é
membro de algum negócio (via `negocio_usuarios`/`e_membro`). Usado no destino
pós-login:
- **não é membro de nenhum negócio →** `/onboarding`.
- **já é membro →** `/painel`.

`/painel` nesta fase é um **placeholder mínimo de área logada** (saúda o usuário,
mostra o nome do negócio, botão de logout). O dashboard real é a Fase 3.

### Etapas do onboarding (`/onboarding`)
Uma etapa por vez, mobile-first:
1. **Nome do negócio.**
2. **Nicho** → mapeado para `negocios.ramo`: Vendas de produtos → `revenda`;
   Alimentação → `alimentacao`; Aluguéis → `locacao`; Serviços → `servicos`;
   Outro → `outro`. (O schema também aceita `beleza`.)
3. **WhatsApp** (número que fará os lançamentos).
4. **Saldo inicial em caixa** (opcional).

### Conclusão (server action `criarNegocioCompleto`)
1. Chama a RPC **`criar_negocio(nome, ramo)`** (existente): cria `negocios`, o
   vínculo `dono` em `negocio_usuarios` e a linha em `metas`; retorna `negocio_id`.
2. Com o vínculo criado, o mesmo usuário — **já sob RLS** — grava:
   - `negocio_telefones` (telefone, `verificado=false`);
   - **templates do ramo** de `src/templates/ramos.ts`: `categorias` (nome, tipo)
     e `itens` de exemplo (nome, preço, unidade, tipo, controla_estoque, estoque);
   - se `saldo_inicial > 0`: um `lancamentos` de `tipo='entrada'`, descrição
     "Saldo inicial", `carteira='empresa'`.
3. **Idempotência:** se o usuário já é membro de um negócio, o onboarding não
   roda de novo (evita duplicar). Se o seeding falhar após a RPC, o negócio já
   existe — a UI mostra o erro e permite tentar de novo sem recriar o negócio.

### Templates de ramo (D5)
`src/templates/ramos.ts` — dado, não código: um objeto por `ramo` com
`categorias` e `itens` de exemplo. Adicionar/editar ramo = editar o arquivo.
Testável (função pura que devolve o template de um ramo).

---

## 4. Deltas de schema — `supabase/migrations/0005_deltas_fase_dominio.sql`

Aplicados agora para as fases 3/4 só construírem UI (princípio D1).

- **`lancamentos`**
  - `carteira TEXT NOT NULL DEFAULT 'empresa' CHECK (carteira IN ('empresa','pessoal'))`
  - `eh_retirada BOOLEAN NOT NULL DEFAULT false`
  - Retirada = `tipo='saida'`, `carteira='empresa'`, `eh_retirada=true`. Relatórios
    de despesa do negócio devem **excluir** `eh_retirada`. Índice parcial opcional
    em retiradas por negócio para a tela "Minhas retiradas".
- **`metas`** (adicionar colunas, todas com default seguro)
  - `limite_prolabore NUMERIC(10,2) NOT NULL DEFAULT 0`
  - `reserva_alvo NUMERIC(10,2) NOT NULL DEFAULT 0`
  - `reserva_prazo DATE`
  - `valor_reservado NUMERIC(10,2) NOT NULL DEFAULT 0`
  - `saldo_minimo NUMERIC(10,2) NOT NULL DEFAULT 0`
- **`receber`**
  - `forma_pagamento TEXT` (ex.: dinheiro, pix, cartão, fiado)
  - `taxa NUMERIC(5,2) NOT NULL DEFAULT 0` (percentual, ex.: 3.99)
- **Trigger** `sync_receber_lancamento` (`CREATE OR REPLACE`): ao marcar `pago`,
  lançar no caixa o **valor líquido** = `valor * (1 - taxa/100)` (arredondado a 2
  casas), não o bruto. Manter a idempotência e o fuso `America/Sao_Paulo` do 0003.

`profiles`: **não** é criada. "Nicho" = `negocios.ramo`; "limite de pró-labore" =
`metas.limite_prolabore`; identidade do usuário = `auth.users`.

**Aplicação das migrations:** `supabase db push` (ou `psql`) contra o projeto
Cloud, usando a connection string / `service_role`. O README ganha o passo a passo.

---

## 5. Verificação

- **Unitário (Vitest, puro):** validação de login; seleção de template por ramo;
  helper de decisão de rota (membro → painel / não-membro → onboarding); mapeamento
  nicho→ramo.
- **Banco:** portar as provas de integração já existentes no histórico
  (`isolamento`, `trigger-receber`) e **estender** para cobrir o líquido com taxa
  e as novas colunas. Rodam contra o Supabase (Cloud de teste ou local); dependem
  de credenciais, então ficam marcadas como suíte de integração.
- **Auth + onboarding ponta a ponta:** verificado manualmente / dirigindo o fluxo
  no navegador depois que as chaves entram (cadastro → confirmação → onboarding →
  painel; login Google; isolamento entre duas contas).

---

## 6. O que o usuário prepara (fora do código)

1. Projeto em **supabase.com** → enviar **Project URL** + **anon key**; colar a
   **`service_role`** no `.env.local`.
2. **Google OAuth:** credencial OAuth no Google Cloud (redirect
   `https://<projeto>.supabase.co/auth/v1/callback`) + Client ID/Secret em
   Supabase → Auth → Providers → Google. Passo a passo detalhado no README.

---

## 7. Fora de escopo desta fase

Dashboard financeiro, lançamentos manuais (CRUD), carteiras/retiradas na UI,
contas a receber na UI, metas/reserva na UI, estoque, WhatsApp. As colunas de
schema existem, mas as telas são das fases 3–6. `/painel` é só um placeholder.

---

## 8. Estrutura de arquivos (visão)

```
.env.local.example
middleware.ts
supabase/migrations/0005_deltas_fase_dominio.sql
src/lib/supabase/{cliente,servidor,admin,middleware}.ts
src/lib/auth/validaLogin.ts            # validação pura (+ teste)
src/lib/auth/roteamento.ts             # decisão membro→painel/onboarding (+ teste)
src/templates/ramos.ts                 # templates por ramo (+ teste)
src/app/entrar/page.tsx                # login + cadastro + Google (substitui o stub)
src/app/auth/callback/route.ts         # troca code->sessão
src/app/onboarding/page.tsx (+ componentes de etapa)
src/app/painel/page.tsx                # placeholder área logada
src/components/auth/*                   # formulários, botão Google, logout
```
