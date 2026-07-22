# Fase 5.9 — Admin de Suporte (responder no app) — Design

**Data:** 2026-07-22
**Contexto:** App em produção (https://meu-gestor-phi.vercel.app). Fase 5.8 criou a `suporte` (own-row).

## Objetivo

Fechar o loop do suporte: o dono responde as perguntas/sugestões **dentro do app**, e o
usuário vê a resposta no próprio histórico. Introduz o primeiro conceito de **admin**.

## Decisões travadas (brainstorming)

1. **Admin por lista de e-mails em env** (`ADMIN_EMAILS`), sem tabela de papéis. Helper
   `ehAdmin()` compara o e-mail do usuário logado com a lista.
2. **Admin lê/atualiza via service_role** (ignora RLS), protegido por `ehAdmin()` no
   servidor — sem mudar a RLS da `suporte`.
3. **Admin:** `autchronos@gmail.com` (o dono loga no app com essa conta para gerenciar).

## Blocos

### Bloco 1 — Identidade de admin

`src/lib/auth/admin.ts`:
```ts
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function ehAdmin(): Promise<boolean> {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  const lista = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return lista.includes(email);
}
```
- Env `ADMIN_EMAILS=autchronos@gmail.com` no `.env.local` **e na Vercel**.
- O dono precisa ter uma **conta no app com esse e-mail** e logar com ela para ser admin.

### Bloco 2 — Migration 0012

```sql
ALTER TABLE suporte ADD COLUMN IF NOT EXISTS resposta       TEXT;
ALTER TABLE suporte ADD COLUMN IF NOT EXISTS respondido_em  TIMESTAMPTZ;
```
- Sem mudança de RLS: o admin escreve via **service_role**; o usuário comum já lê a própria
  linha (agora com `resposta`/`respondido_em`) pela policy own-row existente.
- `verificar-rls` continua passando (a `suporte` já tem RLS + policy; só ganhou colunas).

### Bloco 3 — Tela admin `/painel/suporte/admin`

- **Só admin** (`ehAdmin()`), senão `redirect("/painel/suporte")`.
- Usa o **cliente service_role** (`criarClienteAdmin`) para ler **todas** as mensagens
  (`suporte` + `negocios(nome)` embed), filtro por `?status` (aberto/respondido/resolvido),
  mais recentes primeiro.
- Por mensagem: negócio, tipo, texto, contato, data → `FormResposta` (textarea de resposta
  pré-preenchida + seletor de status) → **Responder**.

### Bloco 4 — Server action `responderSuporte`

`src/app/painel/suporte/acoes.ts` (adiciona à existente):
```ts
export async function responderSuporte(d: { id: string; resposta: string; status: string }) {
  if (!(await ehAdmin())) return { erro: "Acesso negado." };
  if (!["aberto","respondido","resolvido"].includes(d.status)) return { erro: "Status inválido." };
  const admin = criarClienteAdmin();
  const { error } = await admin.from("suporte").update({
    resposta: d.resposta.trim() || null,
    respondido_em: d.resposta.trim() ? new Date().toISOString() : null,
    status: d.status,
  }).eq("id", d.id);
  if (error) return { erro: "Não foi possível salvar a resposta." };
  revalidatePath("/painel/suporte/admin");
  revalidatePath("/painel/suporte");
  return { ok: true };
}
```
- Gating server-side por `ehAdmin()` (o service_role só é usado após a checagem).

### Bloco 5 — Lado do usuário

- `/painel/suporte` (existente): cada mensagem passa a mostrar a **resposta** (quando houver)
  e o status atualizado. Um **link "Ver todas as mensagens (admin) →"** aparece só se
  `ehAdmin()` (leva a `/painel/suporte/admin`). Sem item de nav novo (mantém escondido dos
  demais).

## Money-color / tokens

- Nada de dinheiro. Título `text-marca`, resposta destacada em bloco `bg-superficie`/borda,
  status neutro. Nunca opacidade em token var.

## Casos de borda

- Não-admin acessando `/painel/suporte/admin` → redirect. Server action recusa se `!ehAdmin`.
- `ADMIN_EMAILS` vazio/ausente → ninguém é admin (fail-safe: link e tela não aparecem).
- Resposta vazia + status → limpa `resposta`/`respondido_em` mas atualiza status (ex.: marcar
  resolvido sem texto).
- O usuário só vê a resposta da própria mensagem (RLS own-row inalterada).

## Testes

- Sem novos testes puros. Build + `npm test` (65) verdes; `verificar-rls` → "RLS OK (12)".
- **Prova viva** (estende `verificar-resumo.mjs`): após inserir a mensagem de suporte (5.8),
  o **admin (service_role)** grava `resposta`+`status='respondido'` e relê pelo cliente do
  usuário (own-row) conferindo que a resposta aparece.
- Code review (opus) — foco em gating de admin (service_role só após `ehAdmin`), sem
  vazamento, sem RLS quebrada.

## Entrega (deploy)

Branch → code review → merge → push (auto-deploy). Aplicar **0012** no Supabase; adicionar
`ADMIN_EMAILS=autchronos@gmail.com` nas env vars da Vercel **e** no `.env.local`; garantir
uma conta no app com esse e-mail.

## Fora de escopo (5.9)

- Notificar o usuário por e-mail/WhatsApp quando responder.
- Papéis/permissões além de "admin único por env" (tabela de admins, RBAC).
- Thread de conversa (várias idas e voltas) — por ora, uma resposta por mensagem.
