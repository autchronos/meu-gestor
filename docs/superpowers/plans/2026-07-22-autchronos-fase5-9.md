# Fase 5.9 — Admin de Suporte — Plano

> SUB-SKILL: subagent-driven-development / executing-plans.

**Goal:** Dono responde o suporte no app; usuário vê a resposta. Primeiro conceito de admin (env).

## Global Constraints

- Admin por `ADMIN_EMAILS` (env); `ehAdmin()` server-side. Admin escreve via service_role **só após** `ehAdmin()`. Não muda RLS.
- Tokens institucionais; nunca opacidade em token var. Actions retornam `{erro?}`/`{ok}`.

## File Structure

- Create: `src/lib/auth/admin.ts`; `supabase/migrations/0012_suporte_resposta.sql`; `src/app/painel/suporte/admin/page.tsx`; `src/app/painel/suporte/FormResposta.tsx`.
- Modify: `src/app/painel/suporte/acoes.ts` (add `responderSuporte`); `src/app/painel/suporte/page.tsx` (mostra resposta + link admin); `scripts/verificar-resumo.mjs`.

---

### Task 1: ehAdmin + migration 0012 + action responderSuporte

- [ ] **Step 1: Helper `ehAdmin`** — `src/lib/auth/admin.ts` (código na spec, Bloco 1).

- [ ] **Step 2: Migration** — `supabase/migrations/0012_suporte_resposta.sql`:
```sql
ALTER TABLE suporte ADD COLUMN IF NOT EXISTS resposta       TEXT;
ALTER TABLE suporte ADD COLUMN IF NOT EXISTS respondido_em  TIMESTAMPTZ;
```

- [ ] **Step 3: `responderSuporte`** em `src/app/painel/suporte/acoes.ts` (código na spec, Bloco 4). Importar `ehAdmin` e `criarClienteAdmin`.

- [ ] **Step 4: Build + verificar:rls** → verdes / "RLS OK (12)".

- [ ] **Step 5: Commit**
```bash
git add src/lib/auth/admin.ts supabase/migrations/0012_suporte_resposta.sql src/app/painel/suporte/acoes.ts
git commit -m "feat: ehAdmin + migration 0012 (resposta) + action responderSuporte"
```

---

### Task 2: Tela admin + resposta no lado do usuário + prova viva

- [ ] **Step 1: `FormResposta` (client)** — `src/app/painel/suporte/FormResposta.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { responderSuporte } from "@/app/painel/suporte/acoes";

export function FormResposta({ id, respostaAtual, statusAtual }: { id: string; respostaAtual: string; statusAtual: string }) {
  const [resposta, setResposta] = useState(respostaAtual);
  const [status, setStatus] = useState(statusAtual);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function enviar() {
    setMsg(null);
    iniciar(async () => {
      const r = await responderSuporte({ id, resposta, status });
      setMsg(r?.erro ?? "Resposta salva!");
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-borda pt-3">
      <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={3} placeholder="Escreva a resposta…" className={campo} />
      <div className="flex items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={campo}>
          <option value="aberto">Aberto</option>
          <option value="respondido">Respondido</option>
          <option value="resolvido">Resolvido</option>
        </select>
        <button type="button" onClick={enviar} disabled={pendente}
          className="whitespace-nowrap bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {pendente ? "…" : "Responder"}
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Página admin** — `src/app/painel/suporte/admin/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { ehAdmin } from "@/lib/auth/admin";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { FormResposta } from "@/app/painel/suporte/FormResposta";
import { EstadoVazio } from "@/components/EstadoVazio";

const ROTULO: Record<string, string> = { pergunta: "Pergunta", sugestao: "Sugestão" };

export default async function AdminSuporte({ searchParams }: { searchParams: { status?: string } }) {
  if (!(await ehAdmin())) redirect("/painel/suporte");
  const admin = criarClienteAdmin();
  let q = admin.from("suporte")
    .select("id, tipo, mensagem, contato, resposta, status, created_at, negocios(nome)")
    .order("created_at", { ascending: false }).limit(200);
  const f = searchParams?.status;
  if (f === "aberto" || f === "respondido" || f === "resolvido") q = q.eq("status", f);
  const { data } = await q;
  const mensagens = (data ?? []) as unknown as {
    id: string; tipo: string; mensagem: string; contato: string | null;
    resposta: string | null; status: string; created_at: string; negocios: { nome: string } | null;
  }[];

  const FILTROS = [["", "Todas"], ["aberto", "Abertas"], ["respondido", "Respondidas"], ["resolvido", "Resolvidas"]];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Suporte · admin</h1>
      <form method="get" className="flex border border-borda text-[11px] uppercase tracking-wider">
        {FILTROS.map(([v, r]) => (
          <button key={v} name="status" value={v} type="submit"
            className={`flex-1 px-2 py-2 transition-colors ${(f ?? "") === v ? "bg-marca text-white" : "text-texto-suave hover:text-texto"}`}>{r}</button>
        ))}
      </form>
      {mensagens.length === 0 ? (
        <EstadoVazio Icone={LifeBuoy} titulo="Nenhuma mensagem" descricao="Mensagens de suporte dos usuários aparecem aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {mensagens.map((m) => (
            <li key={m.id} className="border border-borda bg-superficie p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-marca">{ROTULO[m.tipo] ?? m.tipo} · {m.negocios?.nome ?? "—"}</span>
                <span className="text-texto-suave">{new Date(m.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-texto">{m.mensagem}</p>
              {m.contato && <p className="mt-1 text-xs text-texto-suave">Contato: {m.contato}</p>}
              <FormResposta id={m.id} respostaAtual={m.resposta ?? ""} statusAtual={m.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Lado do usuário** — em `src/app/painel/suporte/page.tsx`:
  - Estender o `select` para incluir `resposta`.
  - Renderizar a resposta (quando houver) abaixo da mensagem, em bloco destacado.
  - Adicionar, no topo, um link para `/painel/suporte/admin` **só se `ehAdmin()`** (importar `ehAdmin`).

- [ ] **Step 4: Prova viva** — `scripts/verificar-resumo.mjs`, logo após o bloco de suporte (5.8):
```js
// Fase 5.9: admin responde (service_role) e o usuario le a resposta (own-row).
await admin.from("suporte").update({ resposta: "obrigado!", status: "respondido", respondido_em: new Date().toISOString() }).eq("negocio_id", negId);
const { data: sup2 } = await cli.from("suporte").select("resposta, status").eq("negocio_id", negId).maybeSingle();
assert(sup2?.resposta === "obrigado!" && sup2?.status === "respondido", `usuario le a resposta do admin (veio ${sup2?.status})`);
```

- [ ] **Step 5: Build + testes**

- [ ] **Step 6: Commit**
```bash
git add src/app/painel/suporte scripts/verificar-resumo.mjs
git commit -m "feat: tela admin de suporte (responder) + resposta visivel ao usuario + prova viva"
```

---

## Self-Review

- ehAdmin (env) + gating server-side → Task 1. ✓
- migration 0012 (resposta/respondido_em) sem mudar RLS → Task 1. ✓
- responderSuporte via service_role após ehAdmin → Task 1. ✓
- Tela admin (todas as msgs, filtro, responder) → Task 2. ✓
- Resposta visível ao usuário + link admin condicional → Task 2. ✓
- Prova viva (admin responde, usuário lê) → Task 2. ✓
