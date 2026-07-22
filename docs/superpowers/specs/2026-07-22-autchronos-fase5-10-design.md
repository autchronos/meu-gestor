# Fase 5.10 — Recuperar senha + mensagem de confirmação — Design

**Data:** 2026-07-22
**Contexto:** App em produção. Auth é client-side (`@supabase/ssr` browser client) + `/auth/callback` (route handler que troca `code` por sessão e vai pro `/painel`).

## Objetivo

Fechar dois buracos do fluxo de auth: (1) **"Esqueci a senha"** (recuperação por e-mail →
página para definir nova senha) e (2) uma **mensagem amigável após confirmar o e-mail** de
cadastro (hoje o usuário cai mudo no painel). Interface pt-BR, tokens institucionais.

## Decisões travadas (brainstorming)

1. **"Esqueci a senha" inline** no `/entrar` (um modo a mais no `FormularioAcesso`).
2. Anotar **SMTP próprio** (ex.: Resend) como próximo passo recomendado — os e-mails do
   Supabase padrão são limitados/pouco confiáveis; a funcionalidade fica correta, a entrega
   é config de infra.

## Contexto (como é hoje)

- `FormularioAcesso` (client): modos `entrar`/`cadastrar`. Cadastro = `signUp` com
  `emailRedirectTo: origin/auth/callback`; login = `signInWithPassword` → `/painel`.
- `/auth/callback` (GET): se `code`, `exchangeCodeForSession` → redirect `/painel`; senão
  `/entrar?erro=...`. Trata `error_description` do OAuth.
- `validarEmail`, `validarSenha` (≥6 chars) em `src/lib/auth/validaLogin.ts`.
- Redirect URLs do Supabase já cobrem `…/**` (recovery/confirm caem no callback).

## Blocos

### Bloco 1 — `/auth/callback` com `next`

`src/app/auth/callback/route.ts`:
- Ler `next` do querystring. Validar: precisa começar com `/` e **não** com `//` (evita
  open-redirect para outro host). Se inválido/ausente, usar `/painel`.
- Após `exchangeCodeForSession` OK, redirecionar para `next` (default `/painel`).
- Caminho de erro inalterado.

### Bloco 2 — Esqueci a senha (recuperação)

- `FormularioAcesso`: no modo `entrar`, um link **"Esqueci minha senha?"** que muda para um
  novo modo `recuperar` (campo de e-mail + botão "Enviar link"; link para voltar a "Entrar").
- No `recuperar`: valida e-mail → `supabase.auth.resetPasswordForEmail(email, { redirectTo:
  ` + "`${window.location.origin}/auth/callback?next=/nova-senha`" + ` })`. Mensagem genérica:
  "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha." (sem
  enumeração de contas; mesma msg em sucesso ou erro).
- **`/nova-senha`** (`src/app/nova-senha/page.tsx`, client): o callback já criou a sessão de
  recuperação. Campos: nova senha + confirmação. Valida com `validarSenha` e igualdade →
  `supabase.auth.updateUser({ password })` → em sucesso, mensagem + redirect `/painel`.
  - Se não houver sessão ativa (acesso direto/link expirado): mostra aviso "Link inválido ou
    expirado. Peça um novo em Entrar → Esqueci minha senha." + link para `/entrar`.
  - Verifica a sessão no mount (`getUser`) para decidir entre o form e o aviso.

### Bloco 3 — Mensagem pós-confirmação

- `FormularioAcesso` (cadastro): trocar `emailRedirectTo` para
  ` + "`${window.location.origin}/auth/callback?next=/confirmado`" + `.
- **`/confirmado`** (`src/app/confirmado/page.tsx`): página institucional "Conta confirmada!
  Bem-vindo ao Autchronos." + botão **Continuar** → `/painel` (o painel leva ao onboarding se
  o negócio ainda não existir). Reaproveita o visual do `/entrar` (logo + card).

## Segurança / detalhes

- **`next` validado** (relativo, sem `//`) → sem open-redirect.
- Mensagem de recuperação **genérica** (não revela se o e-mail existe).
- `/nova-senha` só troca a senha com **sessão ativa** (a sessão de recuperação vem do link do
  e-mail); acesso direto sem sessão não faz nada além de mostrar o aviso.
- Sem `service_role`, sem migration, sem mudança de RLS. Só client + o route handler.

## Money-color / tokens

- Nada de dinheiro. Tokens institucionais; título `text-marca`, sucesso `text-entrada`, erro
  `text-saida`. Nunca opacidade em token var.

## Casos de borda

- E-mail inválido no recuperar → erro de validação local.
- Senhas diferentes no `/nova-senha` → erro "as senhas não conferem".
- Link de recuperação expirado → callback manda pra `/entrar?erro=...` (fluxo de erro atual)
  OU, se exchange OK mas sem contexto, `/nova-senha` mostra o aviso.
- Cadastro de e-mail já existente → mensagem genérica atual (inalterada).

## Testes

- **Puro:** helper `destinoSeguro(next)` (usado no callback) → retorna `next` se começa com
  `/` e não com `//`, senão `/painel`. Testar `/painel`, `/nova-senha`, `//evil.com`,
  `https://evil.com`, `""`, `undefined`.
- Build + `npm test` verdes. Verificação manual (não bloqueia, depende de e-mail): pedir
  recuperação, clicar no link, definir nova senha; confirmar cadastro e ver `/confirmado`.
- Code review (opus) — foco em open-redirect no `next`, enumeração de contas, e o fluxo de
  sessão do `/nova-senha`.

## Entrega (deploy) & follow-up

Branch → code review → merge → push (auto-deploy). Sem migration.
**Follow-up recomendado (config, não código):** configurar **SMTP próprio** (ex.: Resend) no
Supabase → Auth → SMTP, para que recuperação e confirmação cheguem de forma confiável.

## Fora de escopo

- Trocar senha logado (tela de "alterar senha" no painel) — futuro.
- Configurar o SMTP em si (é passo do usuário no Supabase/Resend).
- Rate-limit próprio de recuperação (o Supabase já limita no backend).
