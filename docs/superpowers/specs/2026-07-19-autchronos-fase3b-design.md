# Autchronos — Fase 3B (Retiradas & pró-labore) · Design

**Data:** 19/07/2026
**Base:** Fase 3A concluída (núcleo do caixa + capacidades, mergeada no `master`).
Reaproveita a carteira/retirada que o 3A já grava (`lancamentos` com
`eh_retirada=true`, `carteira='empresa'`) e o `metas.limite_prolabore` (já
existe desde a migration `0005`).

Continuação da Fase 3 (3A núcleo / **3B retiradas** / 3C relatórios). Gateada por
`usa_carteiras`.

Decisões confirmadas: limite definido **na tela de Retiradas**; **média semanal =
retiradas dos últimos 28 dias ÷ 4**; **"registrar retirada" incluído** na tela; o
alerta por WhatsApp fica para a Fase 6 (aqui o alerta é visual).

---

## 1. Gating

Tudo do 3B aparece **só quando `usa_carteiras`**:
- Aba "Retiradas" na `NavInferior` (o layout passa a flag).
- Card de pró-labore no dashboard.

Sem `usa_carteiras`, nada disso é renderizado (e o 3A já força `carteira=empresa`
sem opção de retirada).

---

## 2. Migration `0007` — estende `resumo_dashboard`

`CREATE OR REPLACE` da RPC para devolver, além do que já retorna, dois campos:
- `retirado_mes` = Σ(`valor`) de `lancamentos` com `eh_retirada=true`,
  `carteira='empresa'`, no mês corrente (America/Sao_Paulo, `data <= hoje`).
- `limite_prolabore` = `metas.limite_prolabore` do negócio.

Mantém a assinatura `resumo_dashboard(p_negocio_id uuid) RETURNS jsonb`,
`SECURITY DEFINER` + `e_membro`, e a regra de fuso/limite já existentes. Assim o
dashboard continua com **uma única** chamada.

---

## 3. Tela `/painel/retiradas`

Server component (guardado pelo layout de `/painel`), gateado: se
`!usa_carteiras`, `redirect("/painel")`.

Mostra:
- **Retirado no mês** (Σ retiradas do mês) e **quanto resta** do limite
  (`limite − retirado_mes`, nunca negativo na exibição; se ultrapassou, mostra o
  excedente em vinho).
- **Barra de progresso** retirado/limite (dourado quando dentro; vinho quando
  passou). Sem limite definido, mostra só o total, sem barra.
- **Média semanal** (últimos 28 dias ÷ 4).
- **Definir limite de pró-labore**: campo (R$) + salvar → `metas.update`.
- **Registrar retirada**: valor + descrição → cria lançamento retirada.
- **Histórico**: lista das retiradas (data, descrição, valor em vinho), últimas N.

Dados: fetch das retiradas dos últimos ~35 dias (`eh_retirada=true`, ordenado por
data desc, `negocio_id` explícito + RLS); a RPC dá `retirado_mes`+`limite`; a
média vem da função pura.

---

## 4. Card no dashboard

Só se `usa_carteiras` **e** `limite_prolabore > 0`: card "Pró-labore" com
"Você já retirou **R$ X** de **R$ Y** este mês" + barra. Alerta (vinho) se
`retirado_mes > limite`. Usa os campos que a `0007` adicionou à RPC — sem query
extra.

---

## 5. Lógica pura (testada)

- `mediaSemanal(retiradas, hoje): number` — soma as retiradas com
  `data >= hoje-27` e divide por 4. (`retiradas`: `{ data, valor }[]`.)
- `restanteProLabore(limite, retirado): { restante: number; excedente: number }`
  — `restante = max(0, limite − retirado)`, `excedente = max(0, retirado − limite)`.
  (Facilita a UI e o teste do "quanto resta / quanto passou".)

Registrar retirada reusa `resolverLancamento("retirada", "empresa")` do 3A
(tipo=saida, carteira=empresa, eh_retirada=true).

---

## 6. Server actions

- `definirLimite(valor: number)` → `metas.update({ limite_prolabore })` para o
  negócio atual (RLS `metas_all`). Valida `valor >= 0`.
- `registrarRetirada(valor: number, descricao: string)` → valida `valor > 0` e
  descrição; insere `lancamentos` via `resolverLancamento`; `revalidatePath`
  de `/painel` e `/painel/retiradas`.

Ambas resolvem `negocioAtual()` no servidor (nunca confiam em id do cliente).

---

## 7. Estrutura de arquivos (3B)

```
supabase/migrations/0007_resumo_retiradas.sql
src/lib/caixa/prolabore.ts            # mediaSemanal + restanteProLabore
src/components/painel/NavInferior.tsx (modificar: item "Retiradas" gated)
src/app/painel/layout.tsx             (modificar: passa usaCarteiras à nav)
src/app/painel/retiradas/page.tsx
src/app/painel/retiradas/acoes.ts     # definirLimite, registrarRetirada
src/app/painel/retiradas/FormLimite.tsx, FormRetirada.tsx
src/components/painel/CardProLabore.tsx
src/app/painel/page.tsx               (modificar: card pró-labore gated)
tests/prolabore.test.ts
```

---

## 8. Verificação

- **Unitário (Vitest, puro):** `mediaSemanal` (janela de 28 dias, divisão por 4);
  `restanteProLabore` (dentro/limite/excedente).
- **Banco (script):** estende `verificar-resumo.mjs` — com uma retirada de 100 e
  limite 300, `resumo_dashboard` retorna `retirado_mes=100`, `limite_prolabore=300`.
- **E2E manual:** definir limite, registrar retirada, ver o card do dashboard e a
  barra reagirem; ultrapassar o limite e ver o alerta vinho; conferir que a aba
  some quando `usa_carteiras` é desligado em Configurações.

---

## 9. Fora de escopo do 3B

Alerta por WhatsApp ao ultrapassar (Fase 6); relatórios/CSV (3C); contas a receber
(Fase 4); estoque (Fase 5). A carteira "Pessoal" existe mas não ganha tela própria
aqui — o foco do 3B é a retirada (empresa→dono) e o teto de pró-labore.
