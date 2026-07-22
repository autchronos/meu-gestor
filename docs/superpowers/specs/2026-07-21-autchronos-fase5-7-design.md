# Fase 5.7 — Polimento (estados vazios + delete com feedback) — Design

**Data:** 2026-07-21
**Fase anterior:** 5.5 (Hardening) — mergeada (2296582). A 5.6 (tipos) foi adiada conscientemente.

## Objetivo

Duas melhorias de UX antes do deploy, resolvidas com **componentes compartilhados**
(que também eliminam padrões duplicados): estados vazios que orientam o primeiro uso, e
botões de excluir que **confirmam** e **mostram o erro** em vez de falharem em silêncio.
Interface pt-BR, tokens institucionais. Sem migration.

## Contexto (o que muda)

- Hoje as listas vazias mostram texto seco ("Nenhum X ainda.") — primeiro contato pobre.
- Hoje a exclusão usa `<form action={excluir…}>`: `excluirCategoria`/`excluirLancamento`
  são `void` e **engolem o erro**; os wrappers `excluir…Form` (clientes/itens/a-receber/
  locações) descartam o `{erro}` da action. Se a exclusão falha (ex.: cliente com locação
  aberta), o usuário não sabe.

## Blocos

### Bloco 1 — Componente `EstadoVazio`

`src/components/EstadoVazio.tsx` (Server Component): ícone (lucide) + título + descrição +
CTA opcional (link institucional). Renderizado **no lugar da lista** quando vazia
(`{lista.length === 0 ? <EstadoVazio/> : <ul>…</ul>}`) — evita `<div>` dentro de `<ul>`.

Aplicado em (copy que respeita "primeiro uso" vs "filtro sem resultado"):
- **Itens/venda** (`Package`): "Nenhum produto ainda" · "Cadastre seu primeiro produto no
  formulário acima para vender com baixa de estoque."
- **Itens/aluguel** (`PackageOpen`): "Nenhum item de aluguel" · "Cadastre um item acima
  para começar a registrar locações."
- **Clientes** (`Users`): "Nenhum cliente ainda" · "Seus clientes aparecem aqui conforme
  você registra vendas fiado e locações."
- **A receber/abertas** (`HandCoins`): "Nenhuma conta em aberto" · "As vendas a prazo que
  você registrar aparecem aqui até serem pagas."
- **Locações/abertas** (`PackageOpen`): "Nenhuma locação em aberto" · "Quando você alugar
  um item, ele aparece aqui até a devolução."
- **Lançamentos** (`ScrollText`): "Nenhum lançamento no período" · "Ajuste o filtro ou
  registre uma entrada/saída no formulário acima." (respeita o filtro)
- **Categorias** (`Tags`): "Nenhuma categoria ainda" · "Crie categorias para organizar
  suas entradas e saídas."

### Bloco 2 — Componente `BotaoExcluir` + feedback

`src/components/BotaoExcluir.tsx` (`"use client"`): recebe a server action e o id como
props (server action passada a client component — padrão suportado no Next 14). Fluxo:
1. Clique em **"Excluir"** → vira **"Confirmar?"** (`text-saida`, negrito) e auto-reseta em
   ~3s (evita exclusão acidental sem popup nativo).
2. Segundo clique → executa via `useTransition` → se a action retornar `{erro}`, mostra a
   mensagem em `text-saida` logo abaixo; senão, a linha some (revalidate).

Prop `acao` tipada de forma permissiva (`(id: string) => Promise<unknown>`); lê
`(r as { erro?: string })?.erro`.

### Bloco 3 — Actions uniformes + faxina

- `excluirCategoria` e `excluirLancamento` passam a **checar o erro do delete e retornar
  `{ erro?: string }`** (hoje são `void`).
- Substituir todos os `<form action={excluir…}>` das telas por `<BotaoExcluir acao={…}
  id={…} />`, passando a action **que retorna objeto** (não o wrapper).
- **Remover os wrappers de exclusão** que ficam sem uso: `excluirClienteForm`,
  `excluirItemForm`, `excluirReceberForm`, `excluirLocacaoForm`.
- **Manter** os wrappers de ações positivas ainda usados em `<form action>`:
  `marcarPagoForm`/`desmarcarPagoForm` (a receber) e `marcarDevolucaoForm` (locações) —
  fora do escopo desta fase.

## Money-color / tokens

- `EstadoVazio`: ícone e descrição em `text-texto-suave`, título em `text-marca`, CTA com
  borda `border-marca`. `BotaoExcluir`: "Confirmar?" e erro em `text-saida`. Nunca navy em
  dinheiro; nunca opacidade em token var.

## Casos de borda

- Confirmação auto-reseta em ~3s (o `setTimeout` é limpo no unmount para não vazar).
- Erro de exclusão volta o botão ao estado normal e mostra a mensagem (não some a linha).
- Estados vazios de listas filtradas (lançamentos, a receber) usam copy neutra (podem ser
  "primeiro uso" ou "filtro sem resultado").
- Nenhuma mudança de lógica de dados/RLS/dinheiro.

## Testes

- Sem novos testes puros (é UI). Build + `npm test` (65) verdes. Verificação manual (não
  bloqueia): excluir um cliente com locação aberta e ver a mensagem; abrir uma lista vazia
  e ver o `EstadoVazio`.
- Code review (opus) do diff inteiro para garantir zero bug (pedido do usuário no fluxo).

## Fora de escopo (5.7)

- Feedback nas ações positivas (marcar pago/devolução) — já funcionam; ficam para depois.
- Tipos do Supabase (5.6, adiada).
- Toasts globais / biblioteca de notificação (o feedback é inline, suficiente).
