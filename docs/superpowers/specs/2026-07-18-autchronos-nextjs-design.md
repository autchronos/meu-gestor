# Autchronos — Seu Gestor Financeiro · Design (reboot Next.js)

**Data:** 18/07/2026
**Base:** `PLANO-DE-ACAO-APP-MEI.txt` (D1–D7) e o schema Supabase já commitado
(`supabase/migrations/0001..0004`). Este documento faz o *reboot* da camada de
aplicação para **Next.js 14 (App Router)** e resolve as diferenças com o design
antigo (que era Vite/SPA).

---

## 1. O que muda em relação ao trabalho anterior

O repositório já tinha um app **Vite + React** com um schema multi-tenant
maduro. Decisão desta rodada (confirmada com o usuário):

- **Framework:** recomeço limpo em **Next.js 14 App Router + TypeScript**. Não se
  restaura o código Vite. O schema SQL, a RPC, o trigger e o design doc de cores
  continuam sendo fonte de verdade e são reaproveitados.
- **Banco:** **Supabase Cloud novo** (chaves fornecidas na Fase 2).
- **Hospedagem:** **Vercel** no lugar da Hostinger. O motivo do design antigo
  para descartar servidor ("não existe processo de servidor próprio") deixou de
  valer: o webhook do WhatsApp e o parser com a API da Anthropic **exigem**
  runtime de servidor, que as API Routes do Next.js fornecem.
- **Tema:** **escuro é o padrão** (o doc antigo usava claro). A regra semântica
  de cor é preservada: **a cor da marca nunca toca um valor em dinheiro**;
  verde = entrada e vermelho = saída, em qualquer parte do app.
- **Identidade:** base **roxo/azul escuro (índigo/violeta)** para a cor de
  marca, mantendo verde/vermelho reservados a dinheiro.

O que **não** muda: as decisões de produto D1–D7 do plano (multi-tenant já no
MVP, catálogo de itens configurável sem variações, "a receber" unificando fiado
e parceiros, contas a pagar na v2, onboarding com templates de ramo, locação de
itens que saem e voltam).

---

## 2. Arquitetura geral (as 5 fases)

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth + RLS) · API Routes (webhook WhatsApp / parser) · Evolution API
em container (Fase 5) · PWA via **Serwist** (`@serwist/next`) · Deploy Vercel.
Alias `@/` → `src/`. Interface 100% pt-BR, moeda R$ formato brasileiro.

**Isolamento:** por `negocio_id`, nunca por `user_id` (via `e_membro()` +
RLS). É isso que permite o agente de WhatsApp lançar sem login, resolvendo o
telefone → negócio pela tabela `negocio_telefones`.

**Mapeamento pedido → schema existente:**

| Pedido do usuário            | No schema             |
|------------------------------|-----------------------|
| lançamentos (entrada/saída)  | `lancamentos`         |
| categorias padrão + custom   | `categorias`          |
| estoque / itens              | `itens` (+ `lancamento_itens`) |
| nicho no onboarding          | `negocios.ramo`       |
| conexão de WhatsApp          | `negocio_telefones`   |
| log de mensagens             | (tabela nova na Fase 5) |

Nichos do onboarding → `ramo`: Vendas de produtos → `revenda`; Alimentação →
`alimentacao`; Aluguéis → `locacao`; Serviços → `servicos`; Outro → `outro`
(o schema também aceita `beleza`).

**Ordem de construção (cada fase é mostrada rodando antes da próxima):**

1. **Setup + Landing + PWA** — sem banco, sem login.
2. **Auth + onboarding + banco** — Supabase Auth (e-mail/senha + Google), aplica
   as migrations, onboarding em etapas com templates de ramo.
3. **Dashboard financeiro** — visão geral, lançamentos (CRUD), categorias,
   relatórios (CSV), gráfico de fluxo de caixa. Mobile-first.
4. **Controle de estoque** — CRUD de itens, estoque mínimo com alerta, baixa
   automática na venda, adaptação por nicho (incl. locação disponível/alugado).
5. **WhatsApp** — Evolution API → webhook → parser (regex primeiro, modo
   opcional Anthropic) → cria lançamento → responde no WhatsApp. Comandos
   "saldo" e "resumo". Página de conexão com QR code.

---

## 3. Sistema de cores (tokens semânticos, dark default)

Cores entram no Tailwind como **tokens semânticos**, não cores cruas, para
impedir que alguém escreva `text-green-600` num valor por engano.

| Token        | Papel                        | Escuro (padrão) | Claro    |
|--------------|------------------------------|-----------------|----------|
| `fundo`      | Fundo da aplicação           | `#0E0B1A`       | `#F6F5FB`|
| `superficie` | Cards e superfícies          | `#171233`       | `#FFFFFF`|
| `texto`      | Texto principal              | `#ECEAF6`       | `#12101F`|
| `marca`      | Logo, navegação, botões      | `#8B7CF6`       | `#5B46D6`|
| `entrada`    | Dinheiro que entra           | `#5CBF63`       | `#2E7D32`|
| `saida`      | Dinheiro que sai             | `#F1706B`       | `#C62828`|
| `meta`       | Meta atingida (só isso)      | `#D9A93C`       | `#8F6A14`|

A cor de marca é índigo/violeta (roxo/azul escuro), distinta de verde e
vermelho. Verde/vermelho têm dois valores porque somem no tema oposto — mesma
semântica, valor diferente. Título: **Space Grotesk**. Corpo: **Inter**.

---

## 4. Fase 1 — escopo desta rodada

### 4.1 Setup do projeto

- Next.js 14 App Router, TypeScript, Tailwind, `src/`, alias `@/`, `lang="pt-BR"`.
- Fontes via `next/font`: Space Grotesk (títulos) + Inter (corpo).
- Tokens de cor semânticos no `tailwind.config` (dark default via `class`).
- Vitest + Testing Library configurados para as próximas fases.
- Estrutura de pastas preparada (sem implementar fases futuras):
  `src/app`, `src/components`, `src/lib`, `src/hooks`, `src/types`.
- Utilitário `formatarBRL(valor)` → `R$ 1.234,56`, com teste.

### 4.2 Landing page pública (`/`)

Componentes reutilizáveis, seções:

- **Header:** logo "Autchronos" + tagline "Seu Gestor Financeiro", nav por
  âncora, botão destacado **"Entrar / Cadastrar"** → `/entrar` (stub nesta fase).
- **Hero:** nome, slogan, **mockup do app em CSS/SVG** (ainda não há screenshot),
  CTA principal.
- **Recursos:** 3 cards — lançamentos pelo WhatsApp, fluxo de caixa visual,
  estoque por nicho.
- **Como funciona:** 3 passos.
- **Instalação mobile:** botão **"📲 Baixar no celular"** que dispara o prompt de
  instalação (`beforeinstallprompt`). Sem suporte (ex. iOS Safari) → instruções
  de "adicionar à tela inicial".
- **Footer.**

Mobile-first, responsivo, dark, identidade índigo/violeta.

### 4.3 PWA

- `manifest` (nome, `theme_color`, `background_color`, `display: standalone`,
  `start_url`, ícones 192/512 + maskable).
- Service worker via **Serwist** (`@serwist/next`) para instalabilidade + shell
  offline.
- Ícones (SVG → PNG 192/512, incl. maskable).
- Hook `useInstallPrompt` capturando `beforeinstallprompt` (lógica com teste).

### 4.4 Entregável da Fase 1

`npm run dev` sobe a landing dark, responsiva e instalável no celular. Sem
banco e sem login (são a Fase 2). O usuário vê rodando antes de seguir.

### 4.5 Fora do escopo desta fase

Auth, onboarding, dashboard, estoque, WhatsApp, qualquer acesso a banco. O botão
"Entrar / Cadastrar" é um stub até a Fase 2.

---

## 5. Componentização e testes

- Componentes de UI pequenos e de propósito único (`Header`, `Hero`,
  `SecaoRecursos`, `SecaoComoFunciona`, `BotaoInstalar`, `Footer`).
- `src/lib/` = funções puras (ex. `formatarBRL`) testadas com Vitest.
- `src/hooks/` = lógica React (ex. `useInstallPrompt`) com teste do
  comportamento (capturar evento, expor `podeInstalar` e `instalar()`).
- Tipagem forte, sem `any` implícito.
