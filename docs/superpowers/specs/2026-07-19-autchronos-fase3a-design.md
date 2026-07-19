# Autchronos — Fase 3A (Núcleo do caixa + capacidades) · Design

**Data:** 19/07/2026
**Base:** design geral (`2026-07-18`), Fase 2 concluída (auth + onboarding + banco,
mergeada no `master`), schema `0001..0005`. Continua a partir do `/painel`
placeholder.

Esta fase entrega o **coração do app** (categorias, lançamentos, dashboard) e
introduz o **modelo de capacidades por negócio**, que passa a ser o eixo de
*gating* de todas as fases seguintes.

Decisões confirmadas com o usuário:
- Fase 3 decomposta em **3A (núcleo)** / 3B (retiradas & pró-labore) / 3C
  (relatórios & CSV). Este spec é o **3A**.
- Gráfico com **Recharts**. "A receber" entra como **total, só leitura** (o CRUD
  de contas a receber é a Fase 4).
- **Capacidades por negócio**: 4 viram pergunta no onboarding (estoque, fiado,
  locação, PF/PJ), **pré-marcadas pelo ramo**; `usa_metas` fica sempre ligado.
  Editáveis depois em Configurações.

---

## 1. Modelo de capacidades (feature flags por negócio)

Ortogonal ao `ramo`: o ramo dá **defaults**; as flags decidem **quais módulos o
app mostra**. Colunas em `negocios` (migration `0006`):

`usa_estoque`, `usa_fiado`, `usa_locacao`, `usa_carteiras`, `usa_metas`
(booleans). Defaults de coluna conservadores: `usa_carteiras=true`,
`usa_metas=true`, o resto `false`. O onboarding grava os valores reais.

**Defaults por ramo** (`capacidadesPadrao(ramo)`, função pura testada):

| ramo        | estoque | fiado | locação | carteiras | metas |
|-------------|---------|-------|---------|-----------|-------|
| alimentacao | ✓       | –     | –       | ✓         | ✓     |
| revenda     | ✓       | ✓     | –       | ✓         | ✓     |
| beleza      | ✓       | –     | –       | ✓         | ✓     |
| locacao     | –       | –     | ✓       | ✓         | ✓     |
| servicos    | –       | –     | –       | ✓         | ✓     |
| outro       | –       | –     | –       | ✓         | ✓     |

**O que o 3A realmente *gateia* (só o que já existe):**
- `usa_fiado` → mostra/oculta o card **"A receber"** no dashboard.
- `usa_carteiras` → mostra/oculta o seletor de **carteira** e a opção
  **Retirada** no formulário de lançamento (sem ele, tudo é `empresa`).
- `usa_estoque` / `usa_locacao` → apenas **armazenados** agora; a navegação e os
  módulos correspondentes chegam nas Fases 4/5 e passam a ler essas flags então.

---

## 2. Migration `0006`

```sql
-- Capacidades por negocio
ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS usa_estoque   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_fiado     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_locacao   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_carteiras BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS usa_metas     BOOLEAN NOT NULL DEFAULT true;
```

**RPC `resumo_dashboard(p_negocio_id uuid) RETURNS jsonb`** (SECURITY DEFINER +
`e_membro`): devolve os números-cabeçalho por agregação SQL (usa os índices).
- `disponivel` = Σ(entrada) − Σ(saida) na carteira `empresa` (todo o histórico;
  retiradas **reduzem**, pois o dinheiro saiu do caixa).
- `a_receber` = Σ(`receber.valor`) com `pago=false`.
- `entradas_mes` = Σ(entrada, empresa) no mês corrente (America/Sao_Paulo).
- `saidas_mes` = Σ(saida, empresa, **NOT eh_retirada**) no mês (despesas reais).

`REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`

---

## 3. Onboarding — retrofit (a Fase 2 já existe, estendemos)

O wizard passa a ter **5 etapas**: 1) nome, 2) nicho, 3) **"O que seu negócio
usa?"** (checkboxes das 4 capacidades, pré-marcados por `capacidadesPadrao(ramo)`),
4) WhatsApp, 5) saldo inicial.

`criarNegocioCompleto`:
- Após a RPC `criar_negocio`, faz `negocios.update({usa_estoque, usa_fiado,
  usa_locacao, usa_carteiras, usa_metas})` sob RLS (o dono já pode `UPDATE` via
  a policy `negocios_update`).
- **Seeding de itens** só quando `usa_estoque || usa_locacao` (senão, itens de
  exemplo não fazem sentido). Categorias continuam sempre.

---

## 4. Configurações

`/painel/configuracoes`: tela simples com os 5 toggles de capacidade + salvar
(server action `salvarCapacidades` → `negocios.update`). Permite ligar/desligar
depois do onboarding.

---

## 5. Área logada — layout e navegação

`src/app/painel/layout.tsx`: guard de sessão + carrega o `negocio` (nome +
flags) uma vez, e renderiza a navegação. **Mobile-first**: barra inferior fixa
com **Início · Lançamentos · Categorias · Config**; logout no topo. (Estoque,
Locação e A receber ganham item de menu nas fases em que os módulos existem.)

Rotas: `/painel` (dashboard), `/painel/lancamentos`, `/painel/categorias`,
`/painel/configuracoes`. Middleware já protege `/painel/*`.

Helper `negocioAtual()` (server): retorna `{ id, nome, flags }` do negócio do
usuário (via RLS). Usado no layout e nas ações.

---

## 6. Categorias (CRUD)

`/painel/categorias`: lista as categorias do negócio agrupadas por tipo
(entrada/saída), form para **criar** (nome + tipo) e **excluir**. Respeita
`UNIQUE(negocio_id, nome, tipo)` (mensagem em duplicata). Excluir → lançamentos
ficam com `categoria_id NULL` (já é `ON DELETE SET NULL`). Server actions
`criarCategoria` / `excluirCategoria`.

---

## 7. Lançamentos (CRUD + lista com filtros)

**Formulário** (`/painel/lancamentos/novo` e edição): tipo **Entrada / Saída /
Retirada**, valor (`parseValorBRL`), descrição, data (padrão hoje), categoria
(filtrada pelo tipo), carteira **Empresa/Pessoal** (só se `usa_carteiras`).

Mapeamento (`resolverLancamento`, função pura testada):
- **Entrada** → `tipo=entrada`, carteira escolhida, `eh_retirada=false`.
- **Saída** → `tipo=saida`, carteira escolhida, `eh_retirada=false`.
- **Retirada** → `tipo=saida`, `carteira=empresa`, `eh_retirada=true`,
  `categoria=null` (só aparece se `usa_carteiras`).

**Lista** densa (estilo extrato), valores em `entrada`/`saida`, com **filtros**
por query params: período (mês atual por padrão), tipo, categoria, origem
(app/WhatsApp). **Editar** e **excluir**. Server actions `salvarLancamento` /
`excluirLancamento`.

---

## 8. Dashboard (`/painel`)

- **Dois saldos** lado a lado: **Disponível hoje** (`disponivel` da RPC) e
  **A receber** (`a_receber`) — este último **só se `usa_fiado`**.
- **Entradas do mês** e **Saídas do mês** (da RPC; saídas já excluem retiradas).
- **Gráfico de fluxo de caixa** (Recharts `LineChart`, últimos 30 dias): saldo
  acumulado dia a dia, terminando no "Disponível hoje". Série reconstruída por
  `serieFluxoCaixa(lancamentos30d, disponivelAtual, hoje)` (pura, testada):
  `abertura = disponivel − net(30d)`, depois acumula por dia.
- **Últimos lançamentos** (10, via `select` RLS ordenado por `data desc`).

O dinheiro sempre em verde/vinho; a cor da marca (navy) nunca vira valor; o saldo
grande pode usar o dourado sobre faixa navy (regra do design system).

---

## 9. Estrutura de arquivos (3A)

```
supabase/migrations/0006_capacidades_e_resumo.sql
scripts/verificar-banco.mjs                 # estende: checa flags + resumo_dashboard
src/lib/negocio/capacidades.ts              # tipo Flags + capacidadesPadrao(ramo)
src/lib/caixa/lancamento.ts                 # resolverLancamento(tipoUI, carteira)
src/lib/caixa/fluxo.ts                      # serieFluxoCaixa(...)
src/lib/supabase/negocioAtual.ts            # negocioAtual() (server)
src/app/painel/layout.tsx                   # guard + nav (gated)
src/components/painel/NavInferior.tsx
src/app/painel/page.tsx                      # dashboard (substitui o placeholder)
src/components/painel/CardsSaldo.tsx, GraficoFluxo.tsx, UltimosLancamentos.tsx
src/app/painel/lancamentos/page.tsx          # lista + filtros
src/app/painel/lancamentos/FormLancamento.tsx
src/app/painel/lancamentos/acoes.ts          # salvar/excluir lancamento
src/app/painel/categorias/page.tsx + acoes.ts
src/app/painel/configuracoes/page.tsx + acoes.ts
src/app/onboarding/Wizard.tsx (modificar: passo de capacidades)
src/app/onboarding/acoes.ts (modificar: salva flags + seeding condicional)
tests/capacidades.test.ts, tests/lancamento.test.ts, tests/fluxo.test.ts
```

---

## 10. Verificação

- **Unitário (Vitest, puro):** `capacidadesPadrao` (defaults por ramo),
  `resolverLancamento` (mapeamento tipo→{tipo,carteira,eh_retirada}),
  `serieFluxoCaixa` (abertura + acumulado por dia, e a regra de excluir retirada
  do "saídas do mês" é validada no RPC, não aqui).
- **Banco (script):** estende `verificar-banco.mjs` para conferir as flags em
  `negocios` e o retorno do `resumo_dashboard` (disponível, a_receber, mês) com
  dados temporários — incluindo que **retirada reduz o disponível mas não entra
  em `saidas_mes`**.
- **E2E manual/dirigido:** criar lançamentos pelos três tipos, ver o dashboard
  refletir; onboarding com capacidades gravando as flags certas; card "A receber"
  aparecendo só com `usa_fiado`.

---

## 11. Fora de escopo do 3A

Tela "Minhas retiradas" + limite de pró-labore (3B); relatórios/comparativo/CSV
(3C); módulos de estoque (Fase 5), locação (Fase 5) e o CRUD de contas a receber
(Fase 4) — as flags os preparam, mas eles não são construídos aqui. A navegação
do 3A só mostra o que existe (Início, Lançamentos, Categorias, Config).
