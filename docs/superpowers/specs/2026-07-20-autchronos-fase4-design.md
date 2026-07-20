# Fase 4 — Contas a Receber + Reserva — Design

**Data:** 2026-07-20
**Fase anterior:** 3C (Relatório) — mergeada no master (8851ab5).

## Objetivo

Transformar o "A receber" (hoje só um total de leitura no painel/relatório) em um
fluxo completo de **contas a receber** (fiado, cartão, prazo) com marcar-como-pago,
mais um bloco de **reserva de emergência / meta de guardar** e **alerta de saldo
mínimo**. Interface 100% pt-BR, tokens institucionais, sem mexer na matemática do caixa.

## Contexto que já existe (não refazer)

O schema da fase de domínio já foi aplicado na migration 0005:

- `receber(id, negocio_id, cliente_id NOT NULL → clientes, descricao, valor, data,
  vencimento DATE nullable, pago BOOLEAN, forma_pagamento TEXT nullable, taxa
  NUMERIC(5,2) CHECK 0..100)`.
- `clientes(id, negocio_id, nome, telefone nullable, tipo 'pessoa'|'empresa')`.
- `metas(negocio_id PK, meta_faturamento, meta_lucro, limite_prolabore, reserva_alvo,
  reserva_prazo DATE nullable, valor_reservado, saldo_minimo)`.
- **Trigger `sync_receber_lancamento`** (0005): na transição `pago false→true` insere no
  caixa uma **entrada líquida** = `ROUND(valor * (1 - taxa/100), 2)` com `receber_id`
  preenchido; na transição `true→false` apaga o lançamento (`DELETE ... WHERE
  receber_id = NEW.id`). Idempotente (só age na transição de `pago`).
- `lancamentos.receber_id` tem `ON DELETE CASCADE`: apagar uma conta a receber apaga o
  lançamento gerado.
- Flag `usa_fiado` já existe em `negocios` e já controla o card "A receber" no painel.
- `resumo_dashboard` (0006/0007) já devolve `disponivel` e `a_receber`.

Ou seja, a Fase 4 é **UI + server actions**, com uma migration pequena de apoio.

## Blocos e telas

### Bloco 1 — Contas a receber (gated `usa_fiado`)

**`/painel/a-receber`** — novo item de nav (ícone `HandCoins`), só aparece se `usa_fiado`.

- **Formulário "nova conta a receber":**
  - **Cliente**: campo de texto com busca-ou-cria. O usuário digita o nome; ao salvar,
    o server action procura um cliente do negócio com `lower(nome)` igual e reaproveita,
    ou cria um novo. (Ver migration 0009 para a UNIQUE que garante isso sem duplicar.)
  - **Descrição** (texto), **Valor** (parseValorBRL), **Vencimento** (date, opcional),
    **Forma de pagamento** (dropdown: Fiado, Cartão de crédito, Cartão de débito, PIX,
    Boleto, Cheque), **Taxa %** (numérico, default 0, 0..100).
  - Grava em `receber` com `pago=false`, `cliente_id` resolvido, `negocio_id` do
    `negocioAtual()`.
- **Lista:**
  - **Abertas** (`pago=false`) primeiro, ordenadas por `vencimento` asc (nulos por
    último), com **destaque de vencidas** (`vencimento < hojeSP()`) em `text-saida`.
  - Cada linha: cliente, descrição, valor, vencimento, forma/taxa, e ações **Marcar
    pago**, **Editar** (só se aberta), **Excluir**.
  - Total "a receber" (soma das abertas) no topo, em `text-texto` (não é dinheiro no
    caixa; neutro).
  - **Pagas** numa seção/aba separada, somente leitura + **Desmarcar** e **Excluir**.
- **Marcar como pago:** UPDATE `pago=true` → o trigger existente lança a entrada líquida.
  **Desmarcar:** UPDATE `pago=false` → o trigger apaga o lançamento.
- **Editar:** permitido **apenas enquanto `pago=false`** (evita desincronizar o caixa,
  já que o trigger só reage à transição de `pago`). Server action recusa editar conta paga.
- **Excluir:** apaga a linha de `receber`; o lançamento gerado (se houver) cai por cascade.

**`/painel/clientes`** — novo item de nav (ícone `Users`), gated `usa_fiado`.

- CRUD simples: nome, telefone (opcional), tipo (pessoa/empresa).
- Mostra, por cliente, **quanto ele deve** (soma das contas abertas daquele
  `cliente_id`).
- Excluir cliente: bloqueado se houver contas a receber vinculadas (FK
  `ON DELETE CASCADE` apagaria o histórico — em vez disso o server action recusa e
  explica). Editar nome respeita a UNIQUE case-insensitive.

### Bloco 2 — Reserva & saldo mínimo (dentro do Relatório)

Nova seção em **`/painel/relatorios`**, logo abaixo das metas do mês (as metas de
faturamento/lucro já vivem lá desde a 3C).

- **Reserva de emergência (informativa):** alvo (`reserva_alvo`) + prazo
  (`reserva_prazo`, opcional) + **guardado** (`valor_reservado`).
  - Barra de progresso = `valor_reservado / reserva_alvo` (0..100, reusa
    `progressoMeta`).
  - Prazo mostra "faltam X meses" (helper puro).
  - Botões **Guardar** / **Tirar** ajustam só `valor_reservado` (não tocam no caixa).
    Não deixa `valor_reservado` ficar negativo.
  - Definir alvo/prazo/saldo mínimo via server action (reusa/estende o padrão de
    `salvarMetas` da 3C).
- **Saldo mínimo (`saldo_minimo`):** só o gatilho do alerta.

**Alerta de saldo mínimo** — faixa no topo do **painel** (Início) quando
`disponivel < saldo_minimo` (e `saldo_minimo > 0`): "Seu caixa está abaixo do mínimo
que você definiu (R$ X)." Em `text-saida`/borda. Só aparece se configurado.

## Fluxo de dados (resumo)

1. Nova conta → resolve cliente (busca-ou-cria) → insert `receber` (pago=false).
2. Marcar pago → UPDATE pago=true → **trigger** insere entrada líquida no caixa.
3. Desmarcar → UPDATE pago=false → **trigger** apaga o lançamento.
4. Excluir conta → delete `receber` → cascade apaga o lançamento.
5. Reserva Guardar/Tirar → UPDATE `metas.valor_reservado` (clamp ≥ 0). Não afeta caixa.
6. Painel lê `resumo_dashboard.disponivel` + `metas.saldo_minimo` → decide o alerta.

Toda escrita passa por server action com `negocioAtual()` (nunca confia em id do
cliente) e RLS; `revalidatePath` nas telas afetadas.

## Migration 0009 (apoio, pequena)

- `CREATE UNIQUE INDEX ... ON clientes (negocio_id, lower(nome))` — suporte ao
  busca-ou-cria sem duplicar cliente em duplo-clique. (Os índices base
  `idx_clientes_negocio` e `idx_receber_negocio` já existem no 0001; não recriar.)
- `CREATE INDEX IF NOT EXISTS ... ON receber (negocio_id, pago, vencimento)` para a
  lista de abertas ordenada por vencimento.
- Sem RPC nova: marcar-pago, editar, guardar/tirar e definir reserva são UPDATE sob RLS.

## Money-color rule (obrigatório)

- Navy (`text-marca`) **nunca** colore dinheiro.
- Valor a receber e "guardado" na reserva: neutro `text-texto`/`text-texto-suave` (não é
  caixa realizado).
- Vencidas: `text-saida` (vinho).
- Entrada líquida no caixa (gerada pelo trigger) aparece verde no extrato como qualquer
  entrada — sem tratamento especial aqui.
- Barra de reserva: `bg-dourado` sólido (nunca opacidade em token var).

## Casos de borda

- Taxa 0..100 (CHECK já garante); líquido nunca negativo (taxa ≤ 100).
- Marcar/desmarcar pago repetidas vezes é idempotente (trigger só age na transição).
- Conta sem vencimento não é vencida.
- Editar conta paga: recusado pelo server action.
- Excluir cliente com contas: recusado (preserva histórico).
- Guardar/Tirar: clamp `valor_reservado ≥ 0`.
- `usa_fiado=false`: itens de nav e telas de a-receber/clientes não aparecem; server
  actions checam a flag também (gating server-side, padrão da 3A).

## Testes

- **Puros:** `liquido(valor, taxa)` = valor−taxa arredondado; `estaVencida(vencimento,
  hoje)`; `progressoReserva` (reusa progressoMeta); `mesesRestantes(prazo, hoje)`;
  ordenação de abertas (nulos por último); soma "quanto o cliente deve".
- **Verificação viva** (estende `verificar-resumo.mjs`): criar cliente + conta a receber
  (valor 200, taxa 10) → marcar pago → conferir entrada líquida 180 no caixa e no
  `disponivel`; desmarcar → conferir que sumiu.
- Build + `npm test` verdes.

## Fora de escopo (fases futuras)

- Estoque/locação (Fase 5).
- Parcelamento automático em N vendas a receber (uma conta por vez nesta fase).
- Notificações de vencimento por WhatsApp (Fase 6).
- Reserva que movimenta o caixa (decisão: reserva é informativa nesta fase).
