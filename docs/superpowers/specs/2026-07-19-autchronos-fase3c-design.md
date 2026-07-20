# Autchronos — Fase 3C (Relatório) · Design

**Data:** 19/07/2026
**Base:** Fases 1–3B + re-skin, no `master`. Referência de conteúdo:
`docs/design-lovable/modelo-relatorio.jpeg` e `docs/design-lovable/relatorio-referencia.md`
(estrutura do app antecessor Pantera Roxa — só o conteúdo; visual = institucional novo).

Fecha a Fase 3. Substitui o stub `/painel/relatorios`.

Decisões confirmadas: **Lucro é "de caixa"** (Faturamento − Custos; sem custo de
mercadoria/estoque, que vem na Fase 5) e a tela deixa isso claro; **comparativo é
mês atual vs mês anterior (fixo)**, enquanto os cards de métrica seguem o filtro
de período.

---

## 1. Conteúdo da tela `/painel/relatorios`

1. **Metas do mês** (sempre mês atual):
   - Faturamento: `R$ atual / R$ meta (%)` + barra (dourado).
   - Lucro: `R$ atual / R$ meta (%)` + barra.
   - **Comparativo vs mês passado:** Faturamento ↑/↓ % · Lucro ↑/↓ %.
2. **Definir metas:** campos de Faturamento e Lucro alvo (grava
   `metas.meta_faturamento` / `metas.meta_lucro`, que já existem).
3. **Filtro de período:** Hoje / Semana / Mês / Tudo (via query param).
4. **Cards de métrica (seguem o filtro):** Faturamento · Custos · Lucro · Margem %.
5. **A receber:** Σ `receber` pendente.
6. **Exportar CSV:** baixa os lançamentos do período selecionado.

Nota visível na tela: "Lucro = entradas − despesas do período (não inclui custo
de estoque)."

---

## 2. Definições (cálculos)

- **Faturamento** = Σ `lancamentos.valor` com `tipo='entrada'`, `carteira='empresa'`, `data ∈ [de,ate]`.
- **Custos** = Σ com `tipo='saida'`, `carteira='empresa'`, `NOT eh_retirada`, `data ∈ [de,ate]` (despesas; retirada não é custo).
- **Lucro** = Faturamento − Custos.
- **Margem** = Faturamento > 0 ? `Lucro / Faturamento × 100` : 0.
- **Variação** (comparativo) = anterior > 0 ? `(atual − anterior) / anterior × 100` : `—`.
- **Progresso da meta** = meta > 0 ? `min(100, atual / meta × 100)` : 0.

---

## 3. Migration `0008` — RPC `relatorio`

```sql
CREATE OR REPLACE FUNCTION relatorio(p_negocio_id UUID, p_de DATE, p_ate DATE)
RETURNS JSONB AS $$
BEGIN
  IF NOT e_membro(p_negocio_id) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN jsonb_build_object(
    'faturamento', COALESCE((SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id=p_negocio_id AND carteira='empresa' AND tipo='entrada'
        AND data>=p_de AND data<=p_ate),0),
    'custos', COALESCE((SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id=p_negocio_id AND carteira='empresa' AND tipo='saida'
        AND NOT eh_retirada AND data>=p_de AND data<=p_ate),0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public;
REVOKE ALL ON FUNCTION relatorio(UUID,DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION relatorio(UUID,DATE,DATE) TO authenticated;
```

Escala por agregação SQL; `e_membro` garante o isolamento. Aplicada no Cloud como
as anteriores (controlador + usuário no SQL Editor). Verificação estende
`verificar-resumo.mjs` (relatorio com 1 entrada 300 + 1 saída-despesa 100 →
faturamento 300, custos 100).

---

## 4. Lógica pura (testada) — `src/lib/relatorio/calculos.ts`

- `intervaloRelatorio(periodo, hoje): { de: string; ate: string }`
  - `hoje` → `[hoje, hoje]`; `semana` → `[hoje-6, hoje]`; `mes` → `[1º do mês, hoje]`;
    `tudo` → `["2000-01-01", hoje]` (limite inferior distante, sem branch nulo).
  - Datas em fuso America/Sao_Paulo (usa `hojeSP()` como entrada).
- `mesAnterior(hoje): { de, ate }` — mês cheio anterior.
- `margemPct(faturamento, custos): number`.
- `variacaoPct(atual, anterior): number | null` (null se anterior 0).
- `progressoMeta(atual, meta): number` (0–100).

Reusa o padrão de aritmética `Date.UTC` já usado em `periodo.ts`/`prolabore.ts`.

---

## 5. Página, ações e CSV

- `src/app/painel/relatorios/page.tsx` (substitui o stub): lê `searchParams.periodo`
  (default `mes`); calcula os intervalos; chama a RPC `relatorio` para **o período
  selecionado, o mês atual e o mês anterior**; consulta `metas` e a soma de
  `receber` pendente; renderiza tudo (cards de métrica, metas + comparativo,
  a receber, filtro GET, form de metas, link de CSV). Isolamento: `negocioAtual()`
  no servidor + `.eq("negocio_id", …)` + RLS.
- `src/app/painel/relatorios/acoes.ts` — `salvarMetas(faturamento, lucro)` →
  `metas.update({ meta_faturamento, meta_lucro })` (valida ≥ 0). Server action.
- `src/app/painel/relatorios/FormMetas.tsx` — client (parseValorBRL).
- **CSV:** `src/app/painel/relatorios/csv/route.ts` (Route Handler GET). Lê
  `de`/`ate` da query, busca os `lancamentos` do período (RLS via server client),
  monta CSV `;`-separado (`data;descricao;tipo;valor`) e responde com
  `Content-Type: text/csv` + `Content-Disposition: attachment`. O botão "Exportar
  CSV" é um link `<a href="/painel/relatorios/csv?de=…&ate=…" download>`.

Componentes de UI reusam os padrões do re-skin (cards quadrados, `rule`, UPPERCASE,
serif nos números, barras dourado/saida, cores de dinheiro em entrada/saída).

---

## 6. Verificação

- **Unitário (Vitest):** `intervaloRelatorio` (hoje/semana/mes/tudo, virada de mês),
  `mesAnterior`, `margemPct`, `variacaoPct` (incl. anterior 0 → null),
  `progressoMeta`.
- **Banco (script):** estende `verificar-resumo.mjs` — RPC `relatorio` devolve
  faturamento/custos corretos para um intervalo.
- **E2E manual:** definir metas, ver o progresso e o comparativo; trocar o período
  e ver os cards mudarem; baixar o CSV e conferir as linhas.

---

## 7. Fora de escopo

Contagem de unidades/itens vendidos ("garrafas") — depende da Fase 5 (estoque).
Contas a pagar (v2). Nada de mudança em rotas/RLS além da RPC nova.
