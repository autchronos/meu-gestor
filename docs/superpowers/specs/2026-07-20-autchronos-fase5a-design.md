# Fase 5A — Estoque (catálogo + venda com itens) — Design

**Data:** 2026-07-20
**Fase anterior:** 4 (Contas a Receber + Reserva) — mergeada no master (f05129b).
**Sub-fase:** 5A. A **5B (Locação)** vem depois, em spec própria.

## Objetivo

Dar ao MEI de loja/revenda o controle de **estoque** ligado ao **caixa**: um catálogo
de itens, venda que baixa o estoque automaticamente, reposição que (opcionalmente)
lança a despesa, e alerta de estoque baixo. Interface 100% pt-BR, tokens institucionais,
sem mexer na lógica de caixa já existente além de inserir entradas/saídas normais.

## Contexto que já existe (não refazer)

- Tabela `itens(id, negocio_id, nome, preco, unidade, tipo 'venda'|'aluguel',
  controla_estoque, estoque INTEGER, ativo, created_at)`. O estoque mora na própria
  linha. `ativo=false` em vez de DELETE (preserva histórico). `estoque` INTEGER **sem
  CHECK ≥ 0** (pode ficar negativo — ver decisão de venda abaixo).
- Tabela `lancamento_itens(id, lancamento_id → lancamentos ON DELETE CASCADE, item_id →
  itens ON DELETE RESTRICT, quantidade CHECK > 0, preco_unitario)`. `preco_unitario` é
  **copiado** na venda (histórico fiel se o preço mudar depois). RLS por join no
  lançamento pai (`e_membro`), então inserir a linha exige que o lançamento já exista e
  seja do negócio.
- `itens` é semeada no onboarding a partir dos templates de ramo (só se `usa_estoque` ou
  `usa_locacao`). **Não há tela de gestão de itens** e `lancamento_itens` está sem uso.
- Flag `usa_estoque` já existe em `negocios` e já é editável em Configurações.
- `resolverLancamento`, `hojeSP`, `formatarBRL`/`parseValorBRL`, `negocioAtual`,
  `criarClienteServidor` disponíveis. Lançamento avulso (entrada/saída/retirada +
  categoria) já funciona (FormLancamento + salvarLancamento).

## Decisões travadas (brainstorming)

1. **Venda com itens + baixa automática** (não venda avulsa manual). Avulsa continua
   possível.
2. **Reposição pode lançar despesa (opcional).**
3. **Vender além do estoque: avisa, mas deixa vender** (estoque pode ir a negativo; sem
   bloqueio).
4. **Venda com itens não é editável** (só excluir e refazer) — evita dessincronizar o
   estoque.
5. **Estoque mínimo por item** (campo novo) para o alerta.

## Blocos e telas (gated `usa_estoque`)

### Bloco 1 — Catálogo de itens — `/painel/itens`

Novo item de nav (ícone `Package`), só aparece se `usa_estoque`.

- **CRUD de itens de venda** (`tipo='venda'`): nome, preço, unidade, controla_estoque
  (sim/não), estoque atual (na criação = estoque inicial), estoque mínimo.
- **Lista** dos itens `ativo=true`, mostrando estoque atual; **destaque em `text-saida`**
  para itens que controlam estoque e estão **no/abaixo do mínimo** (ou negativos).
- **Excluir** = `UPDATE ativo=false` (não DELETE — `lancamento_itens` referencia com
  RESTRICT; e preserva histórico). Server action.
- **Repor** (por item): informa **quantidade a adicionar** e, **opcionalmente**, **quanto
  pagou**. Se o valor for preenchido, cria uma **saída** no caixa (carteira empresa,
  descrição "Compra de estoque · <item>", categoria opcional). Quantidade pode ser
  negativa (perda/quebra) e nesse caso normalmente sem despesa.
- Itens de aluguel (`tipo='aluguel'`) **não** aparecem aqui (são da 5B).

### Bloco 2 — Venda com itens (no formulário de entrada)

Quando `usa_estoque`, o **FormLancamento em modo entrada** ganha um seletor de itens:

- Linhas de **item + quantidade** (adicionar/remover várias). O **valor total** é
  calculado (Σ qtd × preço) e exibido; a **descrição** é auto-preenchida ("2× Açaí 300ml,
  1× Açaí 500ml") mas o usuário pode sobrescrever.
- **Aviso não-bloqueante** por linha quando a quantidade excede o estoque de um item
  controlado ("tem 3, vendendo 5") — a venda ainda registra.
- Categoria de entrada continua selecionável.
- Ao registrar, chama a **server action `registrarVenda`** (nova), distinta do
  `salvarLancamento` avulso.

**`registrarVenda({ itens: {item_id, quantidade}[], categoria_id, data })`:**
1. Resolve `negocioAtual()`; exige `usa_estoque`.
2. Lê os itens do negócio (preço e nome **autoritativos do servidor**, nunca do cliente).
3. Insere o **lançamento** (tipo entrada, carteira empresa, valor = Σ qtd × preço,
   descrição auto, data, categoria).
4. Insere as linhas em `lancamento_itens` (com `preco_unitario` copiado).
5. O **trigger** baixa o estoque dos itens que controlam (Bloco 4).
6. `revalidatePath` /painel, /painel/lancamentos, /painel/itens.

Venda **avulsa** (sem itens) segue pelo `salvarLancamento` atual, intacta.

**Excluir venda com itens:** usa o `excluirLancamento` existente → `ON DELETE CASCADE`
remove as `lancamento_itens` → o **trigger devolve o estoque**.

**Editar:** `salvarLancamento` recusa editar um lançamento que tenha `lancamento_itens`
(mensagem: "Vendas com itens não podem ser editadas; exclua e refaça."). A lista de
lançamentos não oferece "Editar" para vendas com itens.

### Bloco 3 — Alerta de estoque baixo (painel)

Faixa no **painel** (Início) quando há itens controlados no/abaixo do mínimo (com
`estoque_minimo > 0`): "N itens estão acabando." Link para `/painel/itens`. Em
`text-saida`/`border-saida`. Só aparece se `usa_estoque`.

## Migration 0010 (pequena)

```sql
-- Estoque minimo por item (para o alerta de "acabando").
ALTER TABLE itens ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER NOT NULL DEFAULT 0;

-- Baixa/devolucao de estoque quando a venda ganha/perde itens.
CREATE OR REPLACE FUNCTION sync_estoque_venda() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE itens SET estoque = estoque - NEW.quantidade
      WHERE id = NEW.item_id AND controla_estoque;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE itens SET estoque = estoque + OLD.quantidade
      WHERE id = OLD.item_id AND controla_estoque;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_estoque_venda
  AFTER INSERT OR DELETE ON lancamento_itens
  FOR EACH ROW EXECUTE FUNCTION sync_estoque_venda();
```

- Só itens com `controla_estoque` baixam; os demais só registram a venda.
- `AFTER DELETE` cobre o cascade quando o lançamento é excluído → estoque volta.
- Índices de `lancamento_itens(item_id/lancamento_id)` já existem (0001).

## Fluxo de dados (resumo)

1. Venda com itens → `registrarVenda` insere lançamento (entrada) + `lancamento_itens` →
   **trigger** baixa o estoque (itens controlados).
2. Excluir venda → cascade apaga `lancamento_itens` → **trigger** devolve o estoque.
3. Repor → `+quantidade` no item; se "paguei" preenchido, insere uma **saída** no caixa.
4. Ajuste manual (perda) → `-quantidade` no item; sem despesa.
5. Painel lê os itens controlados abaixo do mínimo → decide o alerta.

Toda escrita via server action com `negocioAtual()` + RLS; preços lidos do servidor
(nunca confiar no cliente).

## Money-color rule (obrigatório)

- Navy nunca colore dinheiro. Total da venda/entradas verde (`text-entrada`); despesa de
  reposição vinho (`text-saida`). Preço do item no catálogo: neutro (`text-texto`).
- Itens "acabando"/estoque negativo: `text-saida`. Alerta de estoque baixo:
  `text-saida`/`border-saida`.
- Barras/áreas: cores sólidas; nunca opacidade em token var.

## Casos de borda

- Quantidade > 0 (CHECK no schema); venda sem nenhum item → cai no fluxo avulso (valor
  manual).
- Vender item que não controla estoque: registra a venda, não mexe em `estoque`.
- Estoque negativo é permitido (decisão 3); exibido em vinho.
- Excluir item (`ativo=false`) não some das vendas antigas (RESTRICT preserva o
  histórico); item inativo não aparece no seletor de venda nem no catálogo.
- Editar venda com itens: recusado no server (decisão 4).
- `registrarVenda` recalcula preço/valor no servidor; ignora preço vindo do cliente.
- Reposição com quantidade 0 ou negativa sem "paguei": só ajuste de estoque.
- Gating `usa_estoque=false`: nav/telas escondidas + server actions recusam.

## Testes

- **Puros:** `totalVenda(linhas: {quantidade, preco}[])` = Σ; `estaAcabando(estoque,
  minimo, controla)` = `controla && minimo > 0 && estoque <= minimo`; `descricaoItens`
  (monta "2× Açaí 300ml, 1× Açaí 500ml").
- **Prova viva** (estende `verificar-resumo.mjs` ou script novo): criar item com estoque
  40 → registrar venda de 2 → estoque 38 e entrada no caixa = 2×preço; excluir a venda →
  estoque volta a 40; repor +50 com "paguei 400" → estoque 88 e saída 400 no caixa.
- Build + `npm test` verdes.

## Fora de escopo (5A)

- Locação/aluguel (5B): itens `tipo='aluguel'`, `locacoes`, devolução, reserva de estoque
  derivada.
- Custo por item / COGS / margem por produto (o Relatório segue cash-based).
- Código de barras, variações/SKU, múltiplos depósitos.
- Editar venda com itens (decisão consciente: excluir e refazer).
