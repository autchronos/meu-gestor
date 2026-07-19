# Autchronos — Re-skin Institucional (design Lovable) · Design

**Data:** 19/07/2026
**Base:** design system extraído do Lovable "autchronos-design-essence"
(`docs/design-lovable/index-css-referencia.md` + `dashboard-referencia.md`) e a
referência de conteúdo do Relatório (`relatorio-referencia.md`). Aplica-se sobre
o app já pronto (Fases 1–3B, no `master`).

**Natureza:** é um **re-skin** — muda a camada visual de TODAS as telas
existentes. **Nenhuma lógica muda** (Supabase, RLS, server actions, gating por
flags, cálculos, testes de lógica pura permanecem intactos).

---

## 1. O que muda (e o que não muda)

A paleta do Lovable é **idêntica** à nossa (navy `#0A2540`, dourado `#C9A227`,
entrada `#1B7A4B`, saída `#9B2335`, fundo `#F7F8FA`, Inter). Então o re-skin é
**acabamento**, com quatro eixos:

1. **Fonte serifada → `Cormorant Garamond`** (hoje Lora). Logo + números grandes.
2. **Cantos retos** (estética de extrato): cards, seções e nav sem `rounded`;
   raio 6px reservado só a inputs/botões, se necessário.
3. **Refinamentos de componente** (do `dashboard-referencia`): faixa/hero navy do
   saldo com **centavos dourados**, labels UPPERCASE com `tracking`, divisórias
   finas (`rule`), caixas de ícone quadradas nas linhas de extrato, `tabular-nums`
   nos números.
4. **Navegação responsiva** (decisão do usuário): **sidebar no desktop**,
   **bottom-nav + drawer no mobile**, com **FAB "+" (novo lançamento)**.

**Não muda:** cores base (só acréscimos), estrutura de dados, RLS, actions,
gating, rotas, testes de lógica.

---

## 2. Fundação (tokens, fontes, utilitários)

- **Fontes** (`next/font/google` em `layout.tsx`): `Cormorant_Garamond`
  (400/500/600/700) → `--fonte-serif`; `Inter` continua `--fonte-sans`.
- **`globals.css`:** manter os tokens hex atuais (já batem). Acréscimos:
  - `--cor-navy-profundo: #0A1B30` (nav/sidebar com um navy um tom mais fundo, se
    quisermos profundidade; senão usa `marca`).
  - `--cor-dourado-suave: #E0C868` (hover/detalhe).
  - `body { font-feature-settings: "tnum" 1, "lnum" 1; }` (números tabulares).
- **Cantos:** revisar componentes trocando `rounded-xl/lg` por sem-raio; inputs
  podem manter `rounded-md`.
- **Divisórias (`rule`):** usar `border-t / border-b border-borda` (1px) — não precisa de
  utilitário novo; a cor `borda #E3E7ED` faz o papel do `--rule`.

Tokens Tailwind já existentes seguem: `fundo`, `superficie`, `borda`, `texto`,
`texto-suave`, `marca` (navy), `dourado`, `entrada`, `saida`.

---

## 3. Navegação responsiva

Um único componente de navegação alimentado pelas flags do negócio, com três
formas:

- **Sidebar (desktop, `lg:` +):** coluna navy fixa à esquerda (~15rem). Logo
  "Autchronos" serifada no topo; lista completa de destinos (Início ·
  Lançamentos · Retiradas *[se `usa_carteiras`]* · Categorias · Relatórios ·
  Config); botão **"+ Novo lançamento"** destacado (dourado); "Sair" no rodapé.
  Item ativo em dourado. O conteúdo principal recebe `lg:pl-[15rem]`.
- **Bottom-nav (mobile, `< lg`):** barra navy fixa embaixo, 4 destinos + **FAB "+"
  central dourado** (novo lançamento). Ativo dourado, labels UPPERCASE. Destinos
  do mobile: Início · Lançamentos · [+] · Relatórios · Config (os demais no
  drawer).
- **Header/drawer (mobile):** topo navy slim com **hambúrguer** (abre um drawer
  navy deslizante com a lista completa — igual à sidebar) + logo + logout.

O FAB/botão "+" → `/painel/lancamentos` com o formulário de novo lançamento aberto
(ex.: `?novo=1`), ou uma rota `/painel/lancamentos/novo`. (Detalhe no plano.)

Rotas inalteradas. "Relatórios" aponta para `/painel/relatorios` (Fase 3C, criado
depois — no re-skin o item pode já existir apontando para um placeholder "em
breve", ou ser adicionado junto da 3C). **Decisão:** incluir o item "Relatórios"
apontando para um stub "em breve" agora, e a 3C substitui o stub.

---

## 4. Padrões de componente (o "essence")

- **Hero/saldo navy:** bloco `bg-marca text-white`; rótulo UPPERCASE
  `tracking-[0.18em] text-white/70` com um chip dourado; valor em
  `font-serif text-4xl/5xl` com **os centavos em `text-dourado`**.
  → componente `ValorDestaque({ valor })` que quebra "R$ X" + `,YY` dourado.
- **Cards:** `border border-borda bg-superficie` (quadrados). Cabeçalho de card:
  título `text-sm font-semibold uppercase tracking-wider text-marca` + ícone
  dourado; `border-b border-borda` separando do corpo.
- **Cards de métrica (grid):** chip quadrado colorido + label
  `text-[10px] uppercase tracking-[0.14em] text-texto-suave` + valor colorido.
- **Linhas de extrato:** ícone em **caixa quadrada** (`border`, cor entrada/saída),
  descrição `text-marca`, subinfo `text-texto-suave`, valor `+/−` colorido
  `tabular-nums`; itens separados por `border-b border-borda`.
- **Gráfico (2 linhas):** entradas (verde) e saídas (vinho) diárias, com área
  suave (`fillOpacity ~0.08`) + linha; legenda + "líquido" do período. Recharts
  com duas séries (ou SVG próprio como na referência). Precisa da série diária
  `serieEntradaSaida(lancs30, hoje) → [{ dia, entrada, saida }]` (função pura,
  testada).
- **Barras de progresso** (pró-labore, metas): trilho `bg-borda`, preenchimento
  `bg-dourado` dentro do alvo / `bg-saida` quando excede.
- **Botões:** primário `bg-marca text-white` (quadrado); FAB/CTA `bg-dourado
  text-marca`. Labels de ação frequentemente UPPERCASE `tracking-wider`.

---

## 5. Telas a re-skinar (todas as existentes)

- **`/` (landing):** logo/hero serif (Cormorant), cards de recurso quadrados,
  seções com `rule`, botão institucional. Mantém o conteúdo atual.
- **`/entrar`:** card quadrado, logo serifada, inputs/botões no novo estilo.
- **`/onboarding`:** wizard em card quadrado, títulos serif, checkboxes de
  capacidade no novo estilo.
- **`painel/layout`:** substitui o header+nav atuais pela **navegação responsiva**
  (sidebar/topbar+bottomnav+drawer).
- **`/painel` (dashboard):** **hero navy** com "Disponível hoje" (`ValorDestaque`);
  cards Entradas/Saídas do mês (chip+uppercase); **gráfico de 2 linhas**;
  card pró-labore (se aplicável) + link p/ Retiradas; card "A receber" (se
  `usa_fiado`); **últimos lançamentos** estilo extrato.
- **`/painel/lancamentos`:** lista estilo extrato (caixas de ícone quadradas),
  filtros como segmento/uppercase, formulário refinado.
- **`/painel/categorias`:** listas em cards quadrados, `rule`.
- **`/painel/retiradas`:** cards quadrados, números serif, barra dourado/saida.
- **`/painel/configuracoes`:** toggles em card quadrado.

Componentes: `Header`→ nova navegação; `NavInferior`→ parte do sistema de nav;
`CardsSaldo`, `GraficoFluxo` (2 linhas), `UltimosLancamentos`, `CardProLabore`
re-skinados; novos `ValorDestaque`, `Sidebar`, `DrawerNav`, `BotaoNovo`.

---

## 6. Verificação

- **Unitário (Vitest):** `serieEntradaSaida` (agrega entradas/saídas por dia);
  `ValorDestaque` (quebra inteiro/centavos) se extraído como função pura. Os
  testes existentes de lógica continuam passando (re-skin não muda lógica).
- **Build + visual:** `npm run build` verde; `npm run dev` e conferir cada tela
  no novo visual, no mobile (bottom-nav + FAB + drawer) e no desktop (sidebar).
- Regra de cor preservada: navy nunca em valor; dourado só acento/saldo;
  entrada/saída no dinheiro.

---

## 7. Fora de escopo (próximos passos, não neste re-skin)

- **Fase 3C — Relatório** (tela nova: metas, comparativo mês a mês, cards de
  métrica, export CSV) — vem **logo depois**, já no visual novo. O item
  "Relatórios" na nav aponta pra um stub "em breve" até lá.
- Contagem de unidades/itens vendidos (depende da Fase 5 — estoque).
- Nenhuma mudança de dados/rotas/RLS.
