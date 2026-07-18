# Autchronos — Meu Gestor Financeiro · Design (reboot Next.js)

**Data:** 18/07/2026
**Base:** `PLANO-DE-ACAO-APP-MEI.txt` (D1–D7), o schema Supabase já commitado
(`supabase/migrations/0001..0004`) e o **handoff de design** deixado pelo usuário
(`prompt-autchronos-claude-code.md` + `logo oficial.png` + `logo sem o nome.png`).
Este documento faz o *reboot* da camada de aplicação para **Next.js 14 (App
Router)** e adota o design system **"Institucional Clássico"** do handoff.

---

## 1. Decisões desta rodada (confirmadas com o usuário)

- **Framework:** recomeço limpo em **Next.js 14 App Router + TypeScript**. Não se
  restaura o código Vite. O schema SQL, a RPC, o trigger e o plano D1–D7 seguem
  sendo fonte de verdade.
- **Banco:** **Supabase Cloud novo** (chaves na Fase 2).
- **Hospedagem:** **Vercel** (o webhook do WhatsApp e o parser Anthropic exigem
  runtime de servidor, que as API Routes fornecem).
- **Nome e tagline:** **"Autchronos — Meu Gestor Financeiro"** em todos os textos,
  header e manifest (alinhado à arte da logo).
- **Design system:** **"Institucional Clássico"** — banco tradicional, sóbrio e
  confiável. **Tema CLARO é o padrão**, com **tema escuro opcional** derivado da
  mesma paleta (toggle persistido, sem flash). Segue-se fielmente os tokens do
  handoff; não se inventam layouts próprios.
  - *Resolução de conflito:* o handoff continha uma linha residual pedindo "dark
    mode / roxo". Ela foi descartada como texto desatualizado — as logos e a
    seção "Design system (OBRIGATÓRIO)" definem azul-marinho + dourado, claro.

O que **não** muda: as decisões de produto D1–D7 (multi-tenant já no MVP,
catálogo de itens configurável sem variações, "a receber" unificando fiado e
parceiros, contas a pagar na v2, onboarding com templates de ramo, locação de
itens que saem e voltam).

---

## 2. Arquitetura geral (as 5 fases)

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth + RLS) · API Routes (webhook WhatsApp / parser) · Evolution API
em container (Fase 5) · PWA via **Serwist** (`@serwist/next`) · Deploy Vercel.
Alias `@/` → `src/`. Interface 100% pt-BR, moeda R$ formato brasileiro
(`1.234,56`).

**Isolamento:** por `negocio_id`, nunca por `user_id` (via `e_membro()` + RLS).
É isso que permite o agente de WhatsApp lançar sem login, resolvendo telefone →
negócio pela tabela `negocio_telefones`.

**Mapeamento pedido → schema existente:**

| Pedido do usuário            | No schema                      |
|------------------------------|--------------------------------|
| lançamentos (entrada/saída)  | `lancamentos`                  |
| categorias padrão + custom   | `categorias`                   |
| a receber (fiado/cartão)     | `receber` (+ trigger → caixa)  |
| clientes (fiado/parceiros)   | `clientes`                     |
| estoque / itens              | `itens` (+ `lancamento_itens`) |
| locação (item sai e volta)   | `locacoes`                     |
| metas                        | `metas`                        |
| nicho no onboarding          | `negocios.ramo`                |
| conexão de WhatsApp          | `negocio_telefones`            |
| log de mensagens             | (tabela nova na Fase 6)        |

Nichos do onboarding → `ramo`: Vendas de produtos → `revenda`; Alimentação →
`alimentacao`; Aluguéis → `locacao`; Serviços → `servicos`; Outro → `outro`
(o schema também aceita `beleza`).

**Deltas de schema para os requisitos novos (a resolver no *brainstorming* da
Fase 2/3/4, registrados aqui para não se perderem):**

- **Carteira PF/PJ (3.1):** `lancamentos.carteira` (`'empresa' | 'pessoal'`,
  default `'empresa'`) e um tipo/marcador de **retirada** (dinheiro Empresa →
  Pessoal, que **não** conta como despesa). Provável extensão do CHECK de `tipo`
  ou um campo `eh_retirada`.
- **Pró-labore (3.1):** limite mensal de retirada no perfil/negócio (ex.
  `metas.limite_prolabore` ou coluna em `negocios`). Card e alerta derivam disso.
- **A receber + cartão (3.2):** `receber` ganha `vencimento` (já existe),
  `forma_pagamento` e `taxa` (percentual) para calcular o **valor líquido** que
  entra no caixa. "Disponível hoje" = soma de `lancamentos`; "A receber" = soma
  de `receber` com `pago = false`.
- **Metas e reserva (3.3):** `metas` ganha `reserva_alvo`, `reserva_prazo`,
  `valor_reservado` e `saldo_minimo` (para o alerta). Reservado sai do "saldo
  disponível para gastar".

Nenhum desses deltas é da Fase 1 — ficam anotados para as fases de domínio.

**Ordem de construção (cada fase é mostrada rodando antes da próxima):**

1. **Setup + Landing + PWA** — sem banco, sem login.
2. **Auth + onboarding + banco** — Supabase Auth (e-mail/senha + Google), aplica
   as migrations (com os deltas acima), onboarding em etapas com templates de ramo.
3. **Dashboard financeiro + carteiras PF/PJ e retiradas** — visão geral com os
   **dois saldos** ("Disponível hoje" e "A receber"), lançamentos (CRUD),
   categorias, relatórios (CSV), gráfico de fluxo de caixa; carteira
   Empresa/Pessoal, tela de retiradas e limite de pró-labore. Mobile-first, denso
   como extrato.
4. **Contas a receber + metas e reserva** — entrada à vista vs. a receber, tela
   "A receber" (vencidos em destaque), taxas de cartão (valor líquido), projeção
   de 30 dias; metas de reserva com barra, valor reservado e alerta de saldo
   mínimo.
5. **Controle de estoque** — CRUD de itens, estoque mínimo com alerta, baixa
   automática na venda, adaptação por nicho (incl. locação disponível/alugado).
6. **WhatsApp** — Evolution API → webhook → parser (regex primeiro, modo
   opcional Anthropic) → cria lançamento → responde no WhatsApp. Entende venda,
   despesa, fiado ("vendi 300 fiado pro João") e retirada ("tirei 200 pra mim").
   Comandos "saldo" e "resumo". Página de conexão com QR code.

---

## 3. Design system "Institucional Clássico"

Sensação-alvo: **banco tradicional** — sóbrio, confiável, denso e organizado
como um extrato bancário. Cards brancos com **bordas sutis e linhas divisórias
finas** (sem sombras fortes). As cores entram no Tailwind como **tokens
semânticos** nomeados, não como cores cruas.

### Tokens de cor

| Token        | Papel                              | Claro (padrão) | Escuro (opcional) |
|--------------|------------------------------------|----------------|-------------------|
| `fundo`      | Fundo da aplicação                 | `#F7F8FA`      | `#0A1524`         |
| `superficie` | Cards e superfícies                | `#FFFFFF`      | `#10203A`         |
| `borda`      | Bordas sutis, divisórias           | `#E3E7ED`      | `#1E3350`         |
| `texto`      | Texto principal                    | `#1A2433`      | `#E6ECF5`         |
| `texto-suave`| Texto secundário / rótulos         | `#5A6675`      | `#9FB0C4`         |
| `marca`      | Header, navegação, títulos, botões | `#0A2540`      | `#3E6DA6`         |
| `dourado`    | Acento: ícones de destaque, saldo  | `#C9A227`      | `#D9B84A`         |
| `entrada`    | Dinheiro que entra                 | `#1B7A4B`      | `#3FA76A`         |
| `saida`      | Dinheiro que sai                   | `#9B2335`      | `#C85462`         |

**Regras de cor (não são preferência):**

1. **A cor da marca (azul-marinho) nunca vira valor em dinheiro.** Verde =
   entrada, vinho = saída, sempre e em qualquer tela.
2. **O dourado é acento, nunca texto de corpo.** Sobre fundo claro ele não passa
   em contraste como texto (~2,6:1). Uso permitido: ícones de destaque,
   preenchimentos e o número do **saldo** (grande) — de preferência sobre a
   superfície azul-marinho do header, onde o contraste é alto.
3. **Verde/vinho têm dois valores** porque perdem contraste no tema oposto;
   mesma semântica, valor diferente conforme o tema.

### Tipografia

- **Serifada** (institucional) — **apenas** no logotipo e nos **números do
  saldo**. Fonte: **Lora** (via `next/font`).
- **Sans-serif clássica e legível** — em todo o restante. Fonte: **Inter**.

### Logos entregues

- `logo oficial.png` — marca completa (engrenagem + relógio + wordmark
  "AUTCHRONOS / MEU GESTOR FINANCEIRO"). Uso: hero e materiais.
- `logo sem o nome.png` — só o ícone (engrenagem azul-marinho + relógio dourado).
  Uso: header (ao lado do wordmark em serif) e base dos **ícones do PWA**
  (192/512 + maskable, com área de segurança sobre fundo azul-marinho).

---

## 4. Fase 1 — escopo desta rodada

### 4.1 Setup do projeto

- Next.js 14 App Router, TypeScript, Tailwind, `src/`, alias `@/`, `lang="pt-BR"`.
- Fontes via `next/font`: **Lora** (serif: logo + saldo) + **Inter** (corpo).
- Tokens de cor semânticos no `tailwind.config` (tema por `class`, **claro é o
  default**; `dark` opcional).
- **Tema:** provider + toggle claro/escuro, persistido em `localStorage`, com
  script inline no `layout` para evitar flash na primeira pintura.
- Vitest + Testing Library configurados para as próximas fases.
- Estrutura de pastas preparada (sem implementar fases futuras):
  `src/app`, `src/components`, `src/lib`, `src/hooks`, `src/types`.
- Utilitário `formatarBRL(valor)` → `R$ 1.234,56`, com teste.

### 4.2 Landing page pública (`/`)

Estilo institucional clássico (claro, azul-marinho + dourado). Componentes
reutilizáveis:

- **Header:** ícone (`logo sem o nome.png`) + wordmark "Autchronos" em serif +
  tagline "Meu Gestor Financeiro"; nav por âncora; botão destacado **"Entrar /
  Cadastrar"** → `/entrar` (stub nesta fase); toggle de tema.
- **Hero:** nome, slogan, **mockup do app** (extrato/dashboard estilizado em
  CSS/SVG, coerente com o design system) e CTA principal.
- **Recursos:** 3 cards — lançamentos pelo WhatsApp, fluxo de caixa visual,
  estoque por nicho.
- **Como funciona:** 3 passos.
- **Instalação mobile:** botão **"📲 Baixar no celular"** que dispara o prompt de
  instalação (`beforeinstallprompt`). Sem suporte (ex. iOS Safari) → instruções
  de "adicionar à tela inicial".
- **Footer.**

Mobile-first, responsivo, com o toggle claro/escuro funcionando.

### 4.3 PWA

- `manifest` (nome "Autchronos — Meu Gestor Financeiro", `theme_color` marca,
  `background_color`, `display: standalone`, `start_url`, ícones 192/512 +
  maskable a partir de `logo sem o nome.png`).
- Service worker via **Serwist** (`@serwist/next`) para instalabilidade + shell
  offline.
- Hook `useInstallPrompt` capturando `beforeinstallprompt` (lógica com teste).

### 4.4 Entregável da Fase 1

`npm run dev` sobe a landing institucional (clara, com toggle de tema),
responsiva e instalável no celular. Sem banco e sem login (Fase 2). O usuário vê
rodando antes de seguir.

### 4.5 Fora do escopo desta fase

Auth, onboarding, dashboard, estoque, WhatsApp, qualquer acesso a banco. O botão
"Entrar / Cadastrar" é um stub até a Fase 2.

---

## 5. Componentização e testes

- Componentes de UI pequenos e de propósito único (`Header`, `Hero`,
  `SecaoRecursos`, `SecaoComoFunciona`, `BotaoInstalar`, `ToggleTema`, `Footer`).
- `src/lib/` = funções puras (ex. `formatarBRL`) testadas com Vitest.
- `src/hooks/` = lógica React (ex. `useInstallPrompt`, tema) com teste de
  comportamento.
- Tipagem forte, sem `any` implícito.
