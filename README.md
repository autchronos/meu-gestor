# Autchronos — Meu Gestor Financeiro

Gestão financeira e fluxo de caixa para micro-empreendedores brasileiros (MEI).
PWA em **Next.js 14** (App Router) + TypeScript + Tailwind + **Supabase** (Postgres + Auth + RLS).

Interface 100% em português, valores no formato brasileiro (R$ 1.234,56), fuso America/Sao_Paulo.

## O que já faz

- **Caixa** — lançamentos de entrada/saída, categorias, carteiras PF/PJ e retiradas (pró-labore)
- **Dashboard** — saldo disponível, a receber, gráfico de fluxo e últimos lançamentos
- **Relatório** — faturamento/custos/lucro/margem por período, comparativo mês a mês, export CSV
- **Metas & Reserva** — metas de faturamento/lucro e reserva de emergência com alerta de saldo mínimo
- **Contas a receber** — fiado/cartão/prazo com taxa, marcar como pago (lança o líquido no caixa), clientes
- **Estoque** — catálogo de itens, venda com baixa automática, reposição, alerta de estoque baixo
- **Locação** — aluguel de itens com devolução prevista e reserva de estoque derivada
- **Suporte** — canal de perguntas e sugestões
- **PWA** — instalável, tema claro/escuro

## Rodar em desenvolvimento

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # testes (Vitest)
npm run build        # build de produção
npm run verificar:rls  # auditoria de RLS das migrations
```

As variáveis de ambiente (Supabase) ficam em `.env.local` (veja `.env.local.example`).
As migrations do banco estão em `supabase/migrations/`.

## Arquitetura

Multi-tenant por `negocio_id` com Row Level Security no Postgres; capacidades por negócio
(estoque/fiado/locação/carteiras) ligam/desligam módulos. Construído em fases, cada uma com
spec + plano em `docs/superpowers/`.
