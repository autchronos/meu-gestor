# Fase 5.8 — Suporte & Sugestões — Design

**Data:** 2026-07-22
**Contexto:** App já em produção (https://meu-gestor-phi.vercel.app), deploy GitHub → Vercel automático.

## Objetivo

Dar aos usuários um canal de suporte (antes e depois de logar) e uma área para enviar
**perguntas** e **sugestões de melhoria**, guardadas no banco para o dono revisar e
evoluir o produto. Interface pt-BR, tokens institucionais.

## Decisões travadas (brainstorming)

1. **Guardar no banco** (tabela `suporte`); dono lê pelo painel do Supabase por enquanto.
2. **Público (deslogado):** só **contato + CTA para entrar** (sem formulário público → sem
   superfície de spam anônimo).
3. **Contato:** e-mail `autchronos@gmail.com` (link `mailto:`).
4. **Item "Suporte" sempre visível** na nav (não depende de módulo).

## Blocos

### Bloco 1 — Migration 0011 (tabela `suporte` + RLS)

```sql
CREATE TABLE suporte (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID REFERENCES negocios(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL DEFAULT auth.uid(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('pergunta','sugestao')),
  mensagem    TEXT NOT NULL,
  contato     TEXT,
  status      TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','respondido','resolvido')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_suporte_user ON suporte (user_id, created_at DESC);

ALTER TABLE suporte ENABLE ROW LEVEL SECURITY;
-- O usuario insere e le SOMENTE as proprias mensagens. O dono le tudo via service_role.
CREATE POLICY suporte_insere ON suporte FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY suporte_le_proprias ON suporte FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT ON suporte TO authenticated;
```
- `user_id` cai em `auth.uid()` por default; a policy de INSERT garante que ninguém grava
  em nome de outro. Sem UPDATE/DELETE para o usuário (só o dono, via dashboard).
- `negocio_id` `ON DELETE SET NULL`: apagar um negócio não apaga o histórico de suporte.
- **Guardião de RLS (5.5) exige RLS + policy** — a `suporte` os tem, então `verificar-rls`
  continua passando (12 tabelas).

### Bloco 2 — Público `/suporte` (deslogado)

Página institucional (Server Component), acessível sem login:
- Título "Precisa de ajuda?" + parágrafo curto.
- **E-mail** `autchronos@gmail.com` como link `mailto:` (destaque dourado/borda marca).
- CTA: "Já tem conta? Entre e mande sua sugestão pelo app." → botão para `/entrar`.
- Reaproveita `Header`/`Footer` da landing para navegação consistente.
- **Link "Suporte"** adicionado ao `Footer` (visível na landing e nas telas públicas).

### Bloco 3 — Painel `/painel/suporte` (logado)

- **Item de nav "Suporte"** (`LifeBuoy`), sempre visível (adicionado em `itens.tsx` sem gating).
- **Formulário** (`FormSuporte`, client): tipo (Pergunta | Sugestão) + mensagem (textarea)
  + contato opcional (placeholder "e-mail/WhatsApp para retorno") → `enviarSuporte`.
- **Histórico**: lista das próprias mensagens (tipo, trecho, `status`, data), mais recentes
  primeiro; `EstadoVazio` (ícone `LifeBuoy`) quando não há nenhuma.
- Mostra o e-mail de contato para urgências.

### Bloco 4 — Server action

`enviarSuporte({ tipo, mensagem, contato })` (`src/app/painel/suporte/acoes.ts`):
- `negocioAtual()` (garante logado + negócio); valida `mensagem.trim()` não vazio e
  `tipo ∈ {pergunta,sugestao}`.
- Insere na `suporte` `{ negocio_id, tipo, mensagem, contato || null }` (o `user_id` cai no
  default `auth.uid()`; a RLS garante).
- `revalidatePath("/painel/suporte")`; retorna `{erro?}`/`{ok}` (padrão das actions).

## Money-color / tokens

- Nada de dinheiro nessas telas. Título `text-marca`, apoio `text-texto-suave`, e-mail com
  acento `text-dourado`/borda `border-marca`. `status` neutro. Nunca opacidade em token var.

## Casos de borda

- Mensagem vazia → erro amigável. `contato` opcional.
- Excluir negócio não apaga o histórico (SET NULL).
- Usuário só vê as próprias mensagens (RLS); isolamento entre contas mantido.
- Deslogado não acessa `/painel/suporte` (o layout do painel já redireciona p/ `/entrar`).

## Testes

- Sem novos testes puros (UI + DB). Build + `npm test` (65) verdes; `npm run verificar:rls`
  → "RLS OK (12 tabelas)".
- **Prova viva** (estende `verificar-resumo.mjs`): como usuário de teste, inserir uma
  mensagem de suporte e ler de volta (RLS own-row) → confere 1 linha; opcional: um 2º
  usuário não vê a mensagem do 1º.
- Code review (opus) do diff inteiro (garantir zero bug).

## Entrega (deploy)

Branch → code review → merge no `master` → **`git push`** (usuário) → Vercel publica
sozinha. **Aplicar a migration 0011** no Supabase (banco de produção). Sem downtime.

## Fora de escopo (5.8)

- Tela de **admin** no app para ler/responder mensagens (por ora, painel do Supabase).
- Notificação ao dono a cada envio (e-mail/WhatsApp) — futuro.
- Base de conhecimento / FAQ / chat ao vivo.
- Formulário público anônimo (decisão: só contato).
