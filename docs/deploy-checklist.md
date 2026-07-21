# Checklist de Deploy — Autchronos

Roteiro dos passos manuais para subir para produção (Vercel + Supabase Cloud).

## 1. Segurança (fazer ANTES de expor)
- [ ] **Rotacionar a `service_role`** no Supabase (Settings → API → Reset). A chave antiga foi colada no chat durante o desenvolvimento.
- [ ] Atualizar `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e nas env vars da Vercel.
- [ ] Confirmar que só a **anon key** e a **URL** são `NEXT_PUBLIC_*` (a service_role NÃO pode ter prefixo público).
- [ ] Rodar `npm run verificar:rls` → "RLS OK".

## 2. Supabase (Cloud)
- [ ] Confirmar as 10 migrations aplicadas (0001–0010).
- [ ] `node scripts/verificar-banco.mjs` e `node scripts/verificar-resumo.mjs` → verdes.
- [ ] Auth → URL Configuration: adicionar a URL de produção em **Site URL** e **Redirect URLs** (`https://SEU-DOMINIO/auth/callback`).

## 3. Vercel
- [ ] Importar o repositório, framework Next.js.
- [ ] Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Deploy. Conferir o build de produção sem erro.

## 4. Google OAuth (lembrete)
- [ ] Google Cloud Console → OAuth 2.0 Client: adicionar a URL de produção como Authorized redirect URI (a callback do Supabase).
- [ ] Colar Client ID/Secret no Supabase → Auth → Providers → Google, e ativar.
- [ ] Testar login com Google em produção.

## 5. PWA
- [ ] Abrir o domínio (HTTPS) no celular; conferir manifest, ícones e o prompt de "instalar".
- [ ] Confirmar que o service worker registra e o app abre offline (shell).

## 6. Pós-deploy (smoke)
- [ ] `/` e `/entrar` carregam (200).
- [ ] `/painel` deslogado redireciona para `/entrar`.
- [ ] Cadastro real → confirmar e-mail → login → criar negócio → onboarding → painel.
- [ ] Um lançamento de teste aparece no dashboard.
