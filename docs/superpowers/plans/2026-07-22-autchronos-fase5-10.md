# Fase 5.10 — Recuperar senha + msg de confirmação — Plano

> SUB-SKILL: subagent-driven-development / executing-plans. Sem migration.

## Global Constraints
- `next` validado (relativo, sem `//`) → sem open-redirect. Mensagem de recuperação genérica. Tokens institucionais. `/nova-senha` só age com sessão ativa.

## File Structure
- Create: `src/lib/auth/destino.ts`, `tests/destino.test.ts`, `src/app/nova-senha/page.tsx`, `src/app/confirmado/page.tsx`.
- Modify: `src/app/auth/callback/route.ts`, `src/components/auth/FormularioAcesso.tsx`.

---

### Task 1: `destinoSeguro` + callback com `next`

- [ ] **Step 1: Teste (falha)** — `tests/destino.test.ts`:
```ts
import { destinoSeguro } from "@/lib/auth/destino";
test("destinoSeguro só aceita caminho relativo seguro", () => {
  expect(destinoSeguro("/painel")).toBe("/painel");
  expect(destinoSeguro("/nova-senha")).toBe("/nova-senha");
  expect(destinoSeguro("//evil.com")).toBe("/painel");
  expect(destinoSeguro("https://evil.com")).toBe("/painel");
  expect(destinoSeguro("")).toBe("/painel");
  expect(destinoSeguro(null)).toBe("/painel");
  expect(destinoSeguro(undefined)).toBe("/painel");
});
```

- [ ] **Step 2: Implementar** — `src/lib/auth/destino.ts`:
```ts
// Só caminho relativo do próprio app (começa com "/" e não com "//"), senão /painel.
// Evita open-redirect via ?next=.
export function destinoSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/painel";
  return next;
}
```

- [ ] **Step 3: Callback** — em `src/app/auth/callback/route.ts`:
  - Importar `destinoSeguro`.
  - Após pegar `searchParams`: `const next = destinoSeguro(searchParams.get("next"));`
  - Trocar o sucesso: `if (!error) return NextResponse.redirect(`${origin}${next}`);`

- [ ] **Step 4: Rodar** `npm test -- destino` (passa) e commit:
```bash
git add src/lib/auth/destino.ts tests/destino.test.ts src/app/auth/callback/route.ts
git commit -m "feat: callback com next validado (destinoSeguro, sem open-redirect)"
```

---

### Task 2: Esqueci a senha + /nova-senha + /confirmado + msg de cadastro

- [ ] **Step 1: `FormularioAcesso`** — `src/components/auth/FormularioAcesso.tsx`:
  - `type Modo = "entrar" | "cadastrar" | "recuperar";`
  - No `signUp`, trocar `emailRedirectTo` para `` `${window.location.origin}/auth/callback?next=/confirmado` ``.
  - Adicionar um handler de recuperação (quando `modo === "recuperar"`): valida e-mail →
    `await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha` })` → sempre mostra o mesmo aviso: "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha."
  - No `enviar`: se `modo === "recuperar"`, chamar o fluxo de recuperação e retornar (não exige senha).
  - UI: quando `modo === "recuperar"`, esconder o campo de senha e o toggle de tabs; mostrar só e-mail + botão "Enviar link" + link "Voltar para Entrar" (`setModo("entrar")`). No `modo === "entrar"`, abaixo do botão, um link "Esqueci minha senha?" (`onClick setModo("recuperar")`).
  - Rótulo do botão: recuperar → "Enviar link"; senão como hoje.

- [ ] **Step 2: `/nova-senha`** — `src/app/nova-senha/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import { validarSenha } from "@/lib/auth/validaLogin";

export default function NovaSenha() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const supabase = criarClienteBrowser();
    supabase.auth.getUser().then(({ data }) => setTemSessao(!!data.user));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = validarSenha(senha);
    if (!v.ok) { setErro(v.erro!); return; }
    if (senha !== confirma) { setErro("As senhas não conferem."); return; }
    setCarregando(true);
    const supabase = criarClienteBrowser();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) { setErro("Não foi possível redefinir. Peça um novo link."); return; }
    setAviso("Senha redefinida! Redirecionando…");
    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Link href="/" className="font-serif text-2xl font-bold text-marca">Autchronos</Link>
        <p className="mt-1 text-sm text-texto-suave">Meu Gestor Financeiro</p>
      </div>
      <div className="border border-borda bg-superficie p-6">
        <h1 className="font-serif text-xl text-marca">Definir nova senha</h1>
        {temSessao === false ? (
          <p className="mt-4 text-sm text-texto-suave">
            Link inválido ou expirado. Peça um novo em <Link href="/entrar" className="text-marca underline">Entrar → Esqueci minha senha</Link>.
          </p>
        ) : (
          <form onSubmit={salvar} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">Nova senha
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} autoComplete="new-password" className="border border-borda bg-superficie px-3 py-2 text-texto" />
            </label>
            <label className="flex flex-col gap-1 text-sm">Confirmar senha
              <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} minLength={6} autoComplete="new-password" className="border border-borda bg-superficie px-3 py-2 text-texto" />
            </label>
            {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
            {aviso && <p role="status" className="text-sm text-entrada">{aviso}</p>}
            <button type="submit" disabled={carregando || temSessao === null}
              className="bg-marca px-4 py-2 font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {carregando ? "Aguarde…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `/confirmado`** — `src/app/confirmado/page.tsx`:
```tsx
import Link from "next/link";

export const metadata = { title: "Conta confirmada — Autchronos" };

export default function Confirmado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10 text-center">
      <div>
        <Link href="/" className="font-serif text-2xl font-bold text-marca">Autchronos</Link>
        <p className="mt-1 text-sm text-texto-suave">Meu Gestor Financeiro</p>
      </div>
      <div className="border border-borda bg-superficie p-6">
        <p className="font-serif text-3xl text-dourado">✓</p>
        <h1 className="mt-2 font-serif text-xl text-marca">Conta confirmada!</h1>
        <p className="mt-2 text-sm text-texto-suave">Seu e-mail foi confirmado. Bem-vindo ao Autchronos — vamos configurar seu negócio.</p>
        <Link href="/painel" className="mt-4 inline-block bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90">
          Continuar
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Build + testes** → verdes.

- [ ] **Step 5: Commit**
```bash
git add src/components/auth/FormularioAcesso.tsx src/app/nova-senha src/app/confirmado
git commit -m "feat: esqueci a senha (recuperacao + /nova-senha) e mensagem /confirmado pos-cadastro"
```

---

## Self-Review
- destinoSeguro + callback next (sem open-redirect) → Task 1. ✓
- Recuperação (link no /entrar + resetPasswordForEmail + /nova-senha) → Task 2. ✓
- Mensagem pós-confirmação (/confirmado + emailRedirectTo next) → Task 2. ✓
