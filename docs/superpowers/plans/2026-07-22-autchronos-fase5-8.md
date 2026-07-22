# Fase 5.8 — Suporte & Sugestões — Plano

> SUB-SKILL: subagent-driven-development ou executing-plans. Passos com checkbox.

**Goal:** Canal de suporte público (contato) + área logada de perguntas/sugestões guardadas no banco.

## Global Constraints

- Tokens institucionais; título `text-marca`, apoio `text-texto-suave`, e-mail acento `text-dourado`/borda `text-marca`. Nunca opacidade em token var.
- RLS own-row na `suporte`; usuário insere/lê só as próprias. `enviarSuporte` retorna `{erro?}`/`{ok}`.
- Item "Suporte" na nav sempre visível.

## File Structure

- Create: `supabase/migrations/0011_suporte.sql`; `src/app/suporte/page.tsx`; `src/app/painel/suporte/{page.tsx,acoes.ts,FormSuporte.tsx}`.
- Modify: `src/components/Footer.tsx`; `src/lib/nav/itens.tsx`; `scripts/verificar-resumo.mjs`.

---

### Task 1: Migration 0011 + público `/suporte` + Footer

- [ ] **Step 1: Migration**

Create `supabase/migrations/0011_suporte.sql`:
```sql
-- ============================================================
-- Fase 5.8: suporte e sugestoes. Usuario insere/le SOMENTE as proprias;
-- o dono le tudo via service_role (dashboard).
-- ============================================================
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
CREATE POLICY suporte_insere ON suporte FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY suporte_le_proprias ON suporte FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT ON suporte TO authenticated;
```

- [ ] **Step 2: Página pública**

Create `src/app/suporte/page.tsx`:
```tsx
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Suporte — Autchronos" };

export default function Suporte() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-serif text-3xl text-marca">Precisa de ajuda?</h1>
        <p className="mt-3 text-sm text-texto-suave">
          Estamos por perto. Mande sua dúvida, problema ou ideia de melhoria — a gente lê tudo.
        </p>
        <div className="mt-6 border border-marca bg-superficie p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-texto-suave">Fale com a gente</p>
          <a href="mailto:autchronos@gmail.com" className="mt-1 block font-serif text-xl text-dourado hover:underline">
            autchronos@gmail.com
          </a>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <p className="text-texto">Já tem conta? Entre e mande sua sugestão direto pelo app — fica registrada e você acompanha.</p>
          <Link href="/entrar" className="self-start border border-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
            Entrar
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Link no Footer**

Modify `src/components/Footer.tsx` — adicionar um link "Suporte" para `/suporte`:
```tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-borda">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-texto-suave">
        <p className="font-serif font-semibold text-marca">Autchronos — Meu Gestor Financeiro</p>
        <p className="mt-1">Gestão financeira para micro-empreendedores brasileiros.</p>
        <Link href="/suporte" className="mt-3 inline-block text-marca hover:underline">Suporte</Link>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Build** (`npm run build`) e `npm run verificar:rls` → "RLS OK (12 tabelas)".

- [ ] **Step 5: Commit**
```bash
git add supabase/migrations/0011_suporte.sql src/app/suporte/page.tsx src/components/Footer.tsx
git commit -m "feat: migration 0011 (suporte) + pagina publica /suporte + link no footer"
```

---

### Task 2: Painel `/painel/suporte` (form + histórico) + nav + prova viva

- [ ] **Step 1: Server action**

Create `src/app/painel/suporte/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export async function enviarSuporte(d: { tipo: "pergunta" | "sugestao"; mensagem: string; contato: string }) {
  if (!d.mensagem.trim()) return { erro: "Escreva sua mensagem." };
  if (d.tipo !== "pergunta" && d.tipo !== "sugestao") return { erro: "Tipo inválido." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  // user_id cai no default auth.uid() (a RLS garante); gravamos negocio_id + conteudo.
  const { error } = await supabase.from("suporte").insert({
    negocio_id: negocio.id, tipo: d.tipo, mensagem: d.mensagem.trim(), contato: d.contato.trim() || null,
  });
  if (error) return { erro: "Não foi possível enviar sua mensagem." };
  revalidatePath("/painel/suporte");
  return { ok: true };
}
```

- [ ] **Step 2: Form (client)**

Create `src/app/painel/suporte/FormSuporte.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { enviarSuporte } from "@/app/painel/suporte/acoes";

export function FormSuporte() {
  const [tipo, setTipo] = useState<"pergunta" | "sugestao">("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [contato, setContato] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function enviar() {
    setMsg(null);
    iniciar(async () => {
      const r = await enviarSuporte({ tipo, mensagem, contato });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Recebemos sua mensagem. Obrigado!");
      setMensagem(""); setContato("");
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Nova mensagem</p>
      <select value={tipo} onChange={(e) => setTipo(e.target.value as "pergunta" | "sugestao")} className={campo}>
        <option value="sugestao">Sugestão de melhoria</option>
        <option value="pergunta">Pergunta / ajuda</option>
      </select>
      <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} placeholder="Escreva aqui…" className={campo} />
      <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="E-mail/WhatsApp para retorno (opcional)" className={campo} />
      <button type="button" onClick={enviar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "Enviando…" : "Enviar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página**

Create `src/app/painel/suporte/page.tsx`:
```tsx
import { LifeBuoy } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { FormSuporte } from "@/app/painel/suporte/FormSuporte";
import { EstadoVazio } from "@/components/EstadoVazio";

const ROTULO: Record<string, string> = { pergunta: "Pergunta", sugestao: "Sugestão" };
const STATUS: Record<string, string> = { aberto: "Aberto", respondido: "Respondido", resolvido: "Resolvido" };

export default async function Suporte() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const { data: mensagens } = await supabase
    .from("suporte").select("id, tipo, mensagem, status, created_at")
    .order("created_at", { ascending: false }).limit(50);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Suporte</h1>
      <p className="text-sm text-texto-suave">
        Dúvidas ou ideias de melhoria? Mande abaixo — a gente lê tudo. Urgente? <a href="mailto:autchronos@gmail.com" className="text-dourado hover:underline">autchronos@gmail.com</a>
      </p>
      <FormSuporte />

      <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Suas mensagens</h2>
      {(mensagens ?? []).length === 0 ? (
        <EstadoVazio Icone={LifeBuoy} titulo="Nenhuma mensagem ainda" descricao="Suas perguntas e sugestões aparecem aqui depois de enviadas." />
      ) : (
        <ul className="border border-borda bg-superficie">
          {(mensagens ?? []).map((m, idx, arr) => (
            <li key={m.id} className={`px-5 py-3 text-sm ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-marca">{ROTULO[m.tipo] ?? m.tipo}</span>
                <span className="text-xs text-texto-suave">{STATUS[m.status] ?? m.status} · {new Date(m.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-texto">{m.mensagem}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Item de nav "Suporte"**

Modify `src/lib/nav/itens.tsx` — importar `LifeBuoy` e adicionar (antes do item "Config"):
```tsx
  itens.push({ href: "/painel/suporte", rotulo: "Suporte", Icone: LifeBuoy });
  itens.push({ href: "/painel/configuracoes", rotulo: "Config", Icone: Settings });
```

- [ ] **Step 5: Prova viva**

Modify `scripts/verificar-resumo.mjs` — ANTES do cleanup, adicionar:
```js
// Fase 5.8: suporte (usuario insere e le a propria mensagem via RLS own-row).
const { error: eSup } = await cli.from("suporte").insert({ negocio_id: negId, tipo: "sugestao", mensagem: "teste de suporte" });
assert(!eSup, "inseriu mensagem de suporte");
const { data: sup } = await cli.from("suporte").select("id, tipo").eq("negocio_id", negId);
assert((sup ?? []).length === 1 && sup[0].tipo === "sugestao", `le a propria mensagem (veio ${sup?.length})`);
```

- [ ] **Step 6: Build + testes**

Run: `npm run build` e `npm test` → verdes. (Prova viva roda o controlador depois que o usuário aplicar a 0011.)

- [ ] **Step 7: Commit**
```bash
git add src/app/painel/suporte src/lib/nav/itens.tsx scripts/verificar-resumo.mjs
git commit -m "feat: painel de suporte (form + historico own-row) + nav + prova viva"
```

---

## Self-Review (cobertura da spec)

- **Migration 0011 (suporte + RLS own-row)** → Task 1. ✓
- **Público /suporte (contato + CTA) + link no footer** → Task 1. ✓
- **Painel /painel/suporte (form + histórico) + nav + action** → Task 2. ✓
- **Prova viva (insere + lê a própria)** → Task 2. ✓
- **Tokens; RLS + policy (verificar-rls 12 tabelas)** → respeitado. ✓
