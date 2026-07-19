# Referência de CONTEÚDO — tela de Relatório

Fonte: screenshot do app **Pantera Roxa** (antecessor; visual roxo/escuro). Aqui
importa a **estrutura/conteúdo**, não a cor — o visual será o institucional
(navy/dourado/Cormorant, claro). Vira a base da **Fase 3C (Relatórios + CSV)**.

## Estrutura observada (de cima p/ baixo)
1. **Header:** nome + "LUCRO MÊS R$ X" + ícones (exportar / lixeira / sair).
2. **Card "MÊS ATUAL" (metas):**
   - Faturamento: `R$ X / R$ meta (%)` + barra de progresso.
   - Lucro: `R$ X / R$ meta (%)` + barra.
   - **VS MÊS PASSADO:** Faturamento ↓/↑ % · Lucro ↓/↑ %.
3. **Filtro de período:** Hoje / Semana / Mês / **Tudo**.
4. **Cards de métrica (2×2):** Faturamento · Custos · Lucro · Margem (%).
5. **Vendas no período:** "105 vendas · 133 garrafas".
6. **A receber:** R$ X (fiados + parceiros pendentes).
7. Bottom nav (6 abas no Pantera; a nossa é diferente).

## Mapeamento para os NOSSOS dados
| Item | Fonte no nosso schema | Status |
|---|---|---|
| Faturamento | Σ entradas (empresa) no período | ✅ temos |
| Custos | Σ saídas NÃO-retirada (empresa) no período | ✅ temos |
| Lucro | Faturamento − Custos | ✅ deriva |
| Margem | Lucro / Faturamento | ✅ deriva |
| Metas (faturamento/lucro) | `metas.meta_faturamento`, `metas.meta_lucro` (já existem em 0001) | ✅ temos (falta UI p/ definir) |
| VS mês passado | comparativo mês atual vs anterior | ✅ deriva (query/RPC) |
| A receber | Σ `receber` pendente | ✅ temos |
| Vendas no período (contagem) | count de lançamentos de entrada | ✅ (aprox.) |
| "garrafas"/unidades | `lancamento_itens` (itens vendidos) | ⏳ depende da Fase 5 (estoque) — adiar a parte de unidades |
| Exportar (CSV) | gerar CSV dos lançamentos do período | ✅ (Fase 3C) |

## Decisão de escopo p/ a 3C (Relatório)
Construir com o que temos: metas (definir + progresso), comparativo mês a mês,
filtro de período, cards faturamento/custos/lucro/margem, a receber, **export CSV**.
Deixar a contagem de **unidades/itens vendidos** para depois da Fase 5 (estoque);
por ora, "vendas" = nº de lançamentos de entrada.
