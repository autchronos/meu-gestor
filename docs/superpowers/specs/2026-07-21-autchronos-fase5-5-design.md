# Fase 5.5 — Hardening pré-deploy — Design

**Data:** 2026-07-21
**Fase anterior:** 5B (Locação) — mergeada no master (c9e24a9). A Fase 5 (domínio funcional do MVP) está completa.

## Objetivo

Fechar as arestas que separam "roda no localhost" de "aguenta usuário real no celular"
antes do deploy: telas de erro/carregamento/404, um guardião de RLS, o CSV protegido
contra injeção de fórmula, e um checklist dos passos manuais do deploy. Escopo enxuto,
100% código (fora o checklist, que é doc). **Sem migration.**

## Contexto (o que falta hoje)

- **Nenhum `error.tsx`/`loading.tsx`/`not-found.tsx`/`global-error.tsx`** no projeto: uma
  consulta lenta ao Supabase mostra tela em branco; um erro não tratado mostra a tela de
  erro crua do Next. Invisível no localhost (rápido, sem erros), visível no 4G/erro real.
- **Sem auditoria de RLS**: RLS foi habilitada em todas as tabelas ao longo das fases, mas
  não há uma verificação automática que quebre se uma tabela futura esquecer a policy.
- **CSV (`/painel/relatorios/csv`)**: campos de texto (descrição/nome) começando com `=`,
  `+`, `-`, `@` podem virar fórmula no Excel de quem abre o arquivo (injeção de fórmula).
- **Passos manuais de deploy** dispersos (rotacionar service_role, env vars, Google OAuth).

Fora de escopo (adiado): geração de tipos do Supabase + wiring (`<Database>`) — vira uma
Fase 5.6 dedicada (refactor grande + passo do usuário no terminal).

## Blocos

### Bloco 1 — Telas de erro / carregamento / 404 (visual institucional)

Todas usam os tokens existentes (fundo `bg-fundo`, navy `text-marca`, serifada no título,
dourado no acento) e copy pt-BR acolhedora.

- **`src/app/painel/loading.tsx`** (Server Component): esqueleto instantâneo mostrado em
  qualquer navegação para uma rota `/painel/*` enquanto o Server Component busca dados.
  Blocos de skeleton neutros (borda + `bg-superficie`), sem opacidade em token var.
- **`src/app/painel/error.tsx`** (`"use client"`): boundary do subtree do painel. Recebe
  `{ error, reset }`. Mensagem amigável ("Algo deu errado ao carregar esta tela.") +
  botão **"Tentar de novo"** que chama `reset()`. Não vaza detalhes técnicos ao usuário.
- **`src/app/global-error.tsx`** (`"use client"`): rede de segurança para erros no layout
  raiz; precisa renderizar suas próprias tags `<html><body>`. Mensagem + botão de recarregar.
- **`src/app/not-found.tsx`** (Server Component): 404 institucional com link para
  `/painel` (ou `/` se deslogado — link simples para a home).

### Bloco 2 — Auditoria de RLS (guardião de regressão)

- **`scripts/verificar-rls.mjs`**: lê **todos** os arquivos `supabase/migrations/*.sql`,
  concatena, e extrai:
  - tabelas criadas em `public` (`CREATE TABLE [IF NOT EXISTS] <nome> (`),
  - tabelas com `ALTER TABLE <nome> ENABLE ROW LEVEL SECURITY`,
  - tabelas com ao menos uma `CREATE POLICY ... ON <nome>`.
  Falha (exit 1, lista os culpados) se alguma tabela criada **não** tem RLS habilitada
  **ou** não tem nenhuma policy. Passa silenciosamente (exit 0, "RLS OK") caso contrário.
- Escolha consciente: **checar as migrations, não o banco vivo** — 100% código, sem
  migration/RPC nem passo do usuário, roda no CI, e quebra se uma fase futura criar uma
  tabela sem RLS (o risco real). O banco vivo já tem a prova de isolamento entre 2 contas
  (Fase 2) como cobertura complementar.
- Adicionar `"verificar:rls": "node scripts/verificar-rls.mjs"` aos scripts do
  `package.json`.

### Bloco 3 — CSV protegido contra injeção de fórmula

- **`src/lib/relatorio/csv.ts`** (novo, puro): `protegerCelulaCSV(valor: string): string`
  — se o texto começa com `=`, `+`, `-`, `@`, `\t` ou `\r`, prefixa com `'` (aspa
  simples), neutralizando a fórmula no Excel/Sheets. Caso contrário devolve igual.
- **`src/app/painel/relatorios/csv/route.ts`**: aplicar `protegerCelulaCSV` a cada célula
  de texto antes do escape de aspas já existente (o BOM + `;` + CRLF continuam).
- Teste puro de `protegerCelulaCSV` (casos `=`, `+`, `-`, `@`, texto normal, vazio).

### Bloco 4 — Checklist de deploy (doc)

- **`docs/deploy-checklist.md`**: roteiro dos passos manuais, agrupados:
  - **Segurança:** rotacionar a `service_role` no Supabase (foi colada no chat) e trocar
    no `.env.local`/Vercel; conferir que só a anon key é `NEXT_PUBLIC_*`.
  - **Vercel:** criar projeto, setar env vars (`NEXT_PUBLIC_SUPABASE_URL`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), build de produção.
  - **Supabase:** adicionar a URL de produção em Auth → Redirect URLs; confirmar as 10
    migrations aplicadas; rodar `verificar-banco`/`verificar-resumo`/`verificar-rls`.
  - **Google OAuth:** criar credencial no Google Cloud com a URL de produção +
    `/auth/callback`; colar no Supabase (lembrete #2 do usuário).
  - **PWA:** conferir manifest/ícones/instalação no domínio real (HTTPS).
  - **Pós-deploy:** smoke das rotas (`/`, `/entrar`, `/painel` redireciona deslogado),
    cadastro real + login + criar negócio.

## Decisões travadas (brainstorming)

1. **5.5 enxuta**, 100% código; tipos do Supabase adiados para a 5.6.
2. **Auditoria de RLS lê as migrations** (não o banco vivo) — guardião de regressão no CI.
3. **Checklist de deploy como doc** agora (não esperar a hora do deploy).
4. Telas de erro/loading no **visual institucional**, copy pt-BR, sem vazar detalhes.

## Money-color / tokens

- Telas de erro/loading/404 seguem os tokens; navy no título, dourado só como acento,
  nunca opacidade em token var. Nada de dinheiro nessas telas (não se aplica a regra de cor).

## Testes

- **Puro:** `protegerCelulaCSV` (prefixa `= + - @ \t \r`; passa texto normal; string vazia).
- **Script:** `node scripts/verificar-rls.mjs` → "RLS OK" (todas as 11 tabelas com RLS +
  policy). Roda no fluxo de verificação.
- Build + `npm test` verdes. Conferência manual (não bloqueia): derrubar a rede e ver o
  `loading`/`error` do painel; acessar uma rota inexistente e ver o `not-found`.

## Fora de escopo (5.5)

- Tipos gerados do Supabase + wiring (`<Database>`) → Fase 5.6.
- Delete com feedback holístico, componente compartilhado de "form em details", estados
  vazios ricos, revisão de a11y, observabilidade (Sentry) → melhorias contínuas pós-deploy.
- O deploy em si (execução) → próprio momento, guiado pelo checklist.
