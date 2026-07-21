# Fase 5B — Locação (aluguel de itens) — Design

**Data:** 2026-07-20
**Fase anterior:** 5A (Estoque) — mergeada no master (96ebc6b).
**Sub-fase:** 5B, fecha o bloco de estoque/locação da Fase 5.

## Objetivo

Dar ao MEI de locadora o controle de **aluguel de itens**: itens que saem para um
cliente e voltam, com **devolução prevista**, **reserva de estoque derivada** (não
dessincroniza) e o dinheiro entrando no caixa (recebido na hora) ou virando conta a
receber. Interface 100% pt-BR, tokens institucionais.

## Contexto que já existe (não refazer)

- Tabela `locacoes(id, negocio_id, item_id → itens RESTRICT, cliente_id → clientes
  RESTRICT NOT NULL, quantidade CHECK > 0, valor, data_retirada DEFAULT hoje,
  devolucao_prevista DATE NOT NULL, devolvido_em DATE nullable, created_at)`.
  `devolvido_em` NULL = ainda na rua.
- Índices `idx_locacoes_negocio` e `idx_locacoes_abertas ON locacoes (item_id) WHERE
  devolvido_em IS NULL` já existem (0001). **A reserva é DERIVADA** (soma das locações
  abertas), nunca uma coluna.
- `itens.tipo` já aceita `'aluguel'`. A tela `/painel/itens` (5A) hoje filtra
  `tipo='venda'` e é gated por `usa_estoque`.
- Flag `usa_locacao` já existe em `negocios`, editável em Configurações; onboarding já
  semeia itens de aluguel quando marcada.
- Clientes (Fase 4): CRUD + busca-ou-cria (`resolverCliente` embutido em
  `a-receber/acoes.ts`), gated por `usa_fiado`. Trigger de "a receber → caixa" (0005)
  lança o líquido quando marca pago.
- `formatarBRL`/`parseValorBRL`, `hojeSP`, `negocioAtual`, `criarClienteServidor`,
  padrões de wrapper void em `<form action>`.

**Sem migration nova:** o schema da locação já está completo.

## Decisões travadas (brainstorming)

1. **Pagamento escolhido na hora:** Recebido agora (entrada no caixa) OU A receber
   (conta a receber — só se `usa_fiado`). Valor em branco/0 = sem lançamento.
2. **Itens de aluguel na mesma tela `/painel/itens`** (seção "Aluguel"), reusando o CRUD.
3. **Sem caução/depósito** nesta fase (fluxo à parte; fica para depois).
4. **Excluir uma locação não mexe no dinheiro** já lançado (registro desacoplado).
5. **Aviso não-bloqueante** quando a quantidade passa do disponível (padrão da venda 5A).

## Blocos e telas

### Bloco 1 — Itens de aluguel (reaproveitar `/painel/itens`)

- A página passa a abrir com **`usa_estoque` OU `usa_locacao`** (hoje só `usa_estoque`).
- `FormItem` ganha o campo **tipo** (venda/aluguel). A criação define o tipo; a listagem
  mostra os itens `venda` (se `usa_estoque`) e `aluguel` (se `usa_locacao`) em seções.
- Para item de **aluguel**: `estoque` = **unidades que você possui**; a tela mostra
  **disponível = estoque − Σ(locações abertas do item)**. Reposição/ajuste do 5A vale
  igual (repor não lança venda; a despesa opcional continua).
- Gating server-side em `itens/acoes.ts`: aceitar quando `usa_estoque || usa_locacao`
  (hoje recusa se `!usa_estoque`). Itens de aluguel não baixam por venda (só `venda`
  entra em `lancamento_itens`).

### Bloco 2 — Clientes abrem também para locação

- Nav, `/painel/clientes` (page) e `clientes/acoes.ts` passam a liberar quando
  **`usa_fiado` OU `usa_locacao`** (hoje só `usa_fiado`). Locação exige cliente.
- Extrair o **busca-ou-cria de cliente** (`resolverCliente`) de `a-receber/acoes.ts` para
  um helper compartilhado `src/lib/clientes/resolver.ts`, reutilizado por a-receber e
  locação (DRY; sem duplicar a lógica de corrida 23505).

### Bloco 3 — Tela de Locação — `/painel/locacoes`

Novo item de nav (ícone `PackageOpen`), gated `usa_locacao`.

- **Nova locação:** item de aluguel (dropdown dos `tipo='aluguel'` ativos, mostrando
  disponível) + **cliente** (busca-ou-cria, datalist como no "a receber") + quantidade +
  valor + data de retirada (default hoje) + **devolução prevista** (obrigatória) +
  **pagamento**: `Recebido agora` | `A receber` (esta opção só aparece se `usa_fiado`) |
  (valor 0 → nenhum lançamento).
  - **Aviso não-bloqueante** se `quantidade > disponível` do item.
  - `registrarLocacao` (server action): resolve cliente, insere `locacoes`; conforme o
    pagamento, insere **entrada** no caixa ("Aluguel · <item>") ou cria **receber**
    ("Aluguel · <item>", cliente vinculado). Preço/nome do item lidos do servidor.
- **Lista de abertas** (`devolvido_em IS NULL`) ordenada por `devolucao_prevista`, com
  **atrasadas em `text-saida`** (`devolucao_prevista < hoje`). Mostra item, cliente,
  quantidade, valor, retirada/devolução prevista. Ação **Marcar devolução**
  (`devolvido_em = hoje`) e **Excluir** (via wrapper void; não mexe no dinheiro).
- **Devolvidas** numa seção separada (histórico, `devolvido_em` preenchido).

### Bloco 4 — (sem alerta novo no painel nesta fase)

O painel já tem o alerta de estoque baixo (5A). Locações atrasadas ficam destacadas na
própria tela de Locação; um alerta no painel pode vir num follow-up.

## Fluxo do dinheiro (resumo)

1. Nova locação → resolve cliente → insere `locacoes`.
2. Pagamento **Recebido agora** → insere **entrada** (carteira empresa, "Aluguel ·
   <item>", valor, data = retirada).
3. Pagamento **A receber** (só `usa_fiado`) → cria **receber** (cliente, descrição
   "Aluguel · <item>", valor, vencimento = devolução prevista). O recebimento segue o
   fluxo da Fase 4 (marcar pago → trigger lança o líquido).
4. Valor 0/branco → só o registro da locação.
5. Marcar devolução → `devolvido_em = hoje` (libera a reserva do item).
6. Excluir locação → remove só o registro de `locacoes` (dinheiro permanece).

Toda escrita via server action com `negocioAtual()` + RLS; gating `usa_locacao`; item e
preço lidos do servidor.

## Reserva derivada

- **Disponível do item** = `itens.estoque − Σ(locacoes.quantidade WHERE item_id = item AND
  devolvido_em IS NULL)`. Calculado buscando as locações abertas do negócio e somando por
  `item_id` (usa o índice `idx_locacoes_abertas`).
- Registrar locação **não** altera `itens.estoque` (a posse continua sua; a reserva é
  derivada). Devolver também não mexe em `estoque` (só limpa a reserva ao setar
  `devolvido_em`).

## Money-color rule (obrigatório)

- Navy nunca colore dinheiro. Valor da locação neutro (`text-texto`); entrada gerada
  verde no extrato; atrasadas em `text-saida`. Nunca opacidade em token var.

## Casos de borda

- `quantidade > 0` (CHECK). Devolução prevista obrigatória (NOT NULL).
- Disponível pode ficar negativo (alugar além do que tem é permitido, com aviso).
- Marcar devolução idempotente na prática (só abertas mostram o botão).
- Excluir cliente com locação: FK RESTRICT já barra; o server action de clientes deve
  recusar com mensagem (hoje só checa `receber`; passa a checar locações abertas também).
- Excluir item de aluguel com locação: `ativo=false` (RESTRICT preserva histórico).
- `usa_locacao=false`: nav/tela escondidas + server actions recusam.
- Pagamento "A receber" sem `usa_fiado`: opção não aparece e o server recusa.

## Testes

- **Puros:** `disponivelAluguel(estoque, reservado)` = `estoque − reservado`;
  `estaAtrasada(devolucao_prevista, devolvido_em, hoje)` = `!devolvido_em &&
  devolucao_prevista < hoje`; soma de reserva por item.
- **Prova viva** (estende `verificar-resumo.mjs`): criar item aluguel (estoque 3) +
  cliente → registrar locação (qtd 1, recebido 80) → conferir entrada 80 no caixa e
  reserva 1 (disponível 2) → marcar devolução → reserva 0; registrar com "a receber" →
  conferir linha em `receber`.
- Build + `npm test` verdes.

## Fora de escopo (5B)

- Caução/depósito (guardar e devolver valor).
- Multa por atraso automática / cálculo de diárias.
- Alerta de locações atrasadas no painel (follow-up).
- Contrato/assinatura, fotos do item.
