# Fase 5A — Estoque (catálogo + venda com itens) — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Passos usam checkbox (`- [ ]`).

**Goal:** Catálogo de itens + estoque ligado ao caixa: venda que baixa estoque, reposição com despesa opcional, alerta de estoque baixo.

**Architecture:** UI + server actions sobre o schema existente (`itens`, `lancamento_itens`). Uma migration pequena (0010) adiciona `estoque_minimo` e um trigger que baixa/devolve estoque quando a venda ganha/perde itens. Gated por `usa_estoque`. Preços lidos do servidor.

**Tech Stack:** Next.js 14 App Router (Server Components + Server Actions), Supabase (Postgres + RLS + trigger), Tailwind (tokens institucionais), Vitest.

## Global Constraints

- **Money-color rule:** navy (`text-marca`) NUNCA colore dinheiro. Total da venda/entradas verde (`text-entrada`); despesa de reposição vinho (`text-saida`); preço do item neutro (`text-texto`). Itens "acabando"/estoque negativo em `text-saida`; alerta de estoque baixo `text-saida`/`border-saida`. **Nunca** opacidade em token var.
- **Server-action safety (lição da Fase 4):** toda função passada a `<form action>` num Server Component deve ser uma Server Action que retorna `void`. Use wrappers void (`excluirItemForm`) + `.bind`; nunca `.bind` de ação que retorna `{ok}|{erro}`, nunca closure inline `async () => {}`.
- **Isolamento:** toda leitura/escrita via `negocioAtual()` (nunca confiar em id/preço do cliente) + RLS; gating server-side `usa_estoque` em todas as actions.
- **Preço autoritativo:** `registrarVenda` lê `itens.preco` do servidor; ignora preço vindo do cliente.
- **Estoque:** só itens com `controla_estoque` baixam. Estoque pode ficar negativo (venda além do estoque é permitida, com aviso). `quantidade > 0` (CHECK no schema).
- **Fuso:** `hojeSP()`. **Moeda:** `formatarBRL`/`parseValorBRL`. pt-BR.

## File Structure

- `supabase/migrations/0010_estoque.sql` (novo) — `estoque_minimo` + trigger `sync_estoque_venda`.
- `src/lib/estoque/calculos.ts` (novo) — `totalVenda`, `estaAcabando`, `descricaoItens` (puros).
- `src/lib/nav/itens.tsx` (modificar) — item "Itens" gated `usa_estoque`.
- `src/components/nav/Sidebar.tsx`, `DrawerNav.tsx`, `src/app/painel/layout.tsx` (modificar) — passar `usaEstoque`.
- `src/app/painel/itens/{page.tsx,acoes.ts,FormItem.tsx}` (novo) — catálogo + repor.
- `src/app/painel/lancamentos/{acoes.ts,FormLancamento.tsx,page.tsx}` (modificar) — venda com itens.
- `src/app/painel/page.tsx` (modificar) — alerta de estoque baixo.
- `scripts/verificar-resumo.mjs` (modificar) — prova viva do trigger.

---

### Task 1: Migration 0010 + cálculos puros de estoque

**Files:**
- Create: `supabase/migrations/0010_estoque.sql`
- Create: `src/lib/estoque/calculos.ts`
- Test: `tests/estoque-calculos.test.ts`

**Interfaces:**
- Produces: `totalVenda(linhas)`, `estaAcabando(estoque, minimo, controla)`, `descricaoItens(linhas)`. Migration cria `itens.estoque_minimo` + trigger `sync_estoque_venda`.

- [ ] **Step 1: Migration**

Create `supabase/migrations/0010_estoque.sql`:
```sql
-- ============================================================
-- Fase 5A: estoque minimo + baixa/devolucao automatica na venda.
-- ============================================================
ALTER TABLE itens ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER NOT NULL DEFAULT 0;

-- Baixa o estoque quando um item entra numa venda; devolve quando sai
-- (inclusive no ON DELETE CASCADE ao excluir o lancamento). So itens que
-- controlam estoque. RETURN NULL: e AFTER, o retorno e ignorado.
CREATE OR REPLACE FUNCTION sync_estoque_venda() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE itens SET estoque = estoque - NEW.quantidade
      WHERE id = NEW.item_id AND controla_estoque;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE itens SET estoque = estoque + OLD.quantidade
      WHERE id = OLD.item_id AND controla_estoque;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_estoque_venda ON lancamento_itens;
CREATE TRIGGER trg_sync_estoque_venda
  AFTER INSERT OR DELETE ON lancamento_itens
  FOR EACH ROW EXECUTE FUNCTION sync_estoque_venda();
```

- [ ] **Step 2: Teste dos cálculos (falha primeiro)**

Create `tests/estoque-calculos.test.ts`:
```ts
import { totalVenda, estaAcabando, descricaoItens } from "@/lib/estoque/calculos";

test("totalVenda soma quantidade × preço e arredonda", () => {
  expect(totalVenda([{ quantidade: 2, preco: 15 }])).toBe(30);
  expect(totalVenda([{ quantidade: 2, preco: 15 }, { quantidade: 1, preco: 20 }])).toBe(50);
  expect(totalVenda([{ quantidade: 3, preco: 3.33 }])).toBe(9.99);
  expect(totalVenda([])).toBe(0);
});

test("estaAcabando: só quando controla, tem mínimo e estoque ≤ mínimo", () => {
  expect(estaAcabando(2, 5, true)).toBe(true);
  expect(estaAcabando(5, 5, true)).toBe(true);
  expect(estaAcabando(6, 5, true)).toBe(false);
  expect(estaAcabando(-1, 5, true)).toBe(true);
  expect(estaAcabando(0, 0, true)).toBe(false); // sem mínimo definido
  expect(estaAcabando(2, 5, false)).toBe(false); // não controla
});

test("descricaoItens monta o resumo pt-BR", () => {
  expect(descricaoItens([{ quantidade: 2, nome: "Açaí 300ml" }, { quantidade: 1, nome: "Açaí 500ml" }]))
    .toBe("2× Açaí 300ml, 1× Açaí 500ml");
});
```

- [ ] **Step 3: Rodar (deve falhar)**

Run: `npm test -- estoque-calculos`
Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar**

Create `src/lib/estoque/calculos.ts`:
```ts
export interface LinhaVenda { quantidade: number; preco: number }

export function totalVenda(linhas: LinhaVenda[]): number {
  return Math.round(linhas.reduce((a, l) => a + l.quantidade * l.preco, 0) * 100) / 100;
}

// Acabando = controla estoque, tem minimo definido (>0) e estoque no/abaixo dele.
export function estaAcabando(estoque: number, minimo: number, controla: boolean): boolean {
  return controla && minimo > 0 && estoque <= minimo;
}

export function descricaoItens(linhas: { quantidade: number; nome: string }[]): string {
  return linhas.map((l) => `${l.quantidade}× ${l.nome}`).join(", ");
}
```

- [ ] **Step 5: Rodar (deve passar)**

Run: `npm test -- estoque-calculos`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0010_estoque.sql src/lib/estoque/calculos.ts tests/estoque-calculos.test.ts
git commit -m "feat: migration 0010 (estoque_minimo + trigger baixa) e calculos de estoque"
```

**Dependência externa:** o usuário aplica a 0010 no Supabase SQL Editor antes da prova viva (Task 3).

---

### Task 2: Catálogo de itens (`/painel/itens`) + navegação

**Files:**
- Create: `src/app/painel/itens/acoes.ts`, `src/app/painel/itens/FormItem.tsx`, `src/app/painel/itens/page.tsx`
- Modify: `src/lib/nav/itens.tsx`, `src/components/nav/Sidebar.tsx`, `src/components/nav/DrawerNav.tsx`, `src/app/painel/layout.tsx`

**Interfaces:**
- Consumes: `negocioAtual()` (tem `usa_estoque`), `estaAcabando` (Task 1), `formatarBRL`, `hojeSP`.
- Produces: server actions `salvarItem`, `excluirItem`+`excluirItemForm`, `reporEstoque`; item de nav "Itens"; `itensNav` passa a exigir `{ usa_carteiras, usa_fiado, usa_estoque }`.

- [ ] **Step 1: Server actions**

Create `src/app/painel/itens/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_estoque) return { negocio: null, erro: "Estoque está desativado nas configurações." as string };
  return { negocio, erro: "" };
}

export interface DadosItem {
  id?: string; nome: string; preco: number; unidade: string;
  controla_estoque: boolean; estoque: number; estoque_minimo: number;
}

export async function salvarItem(d: DadosItem) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "Informe o nome do item." };
  if (d.preco < 0) return { erro: "O preço não pode ser negativo." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  // Base: campos editaveis. O estoque so entra na CRIACAO (depois muda via
  // venda/reposicao, nunca por edicao do cadastro).
  const base = {
    negocio_id: g.negocio.id, nome, preco: d.preco, unidade: d.unidade.trim() || "un",
    tipo: "venda", controla_estoque: d.controla_estoque,
    estoque_minimo: Math.max(0, Math.trunc(d.estoque_minimo)),
  };
  const resp = d.id
    ? await supabase.from("itens").update(base).eq("id", d.id)
    : await supabase.from("itens").insert({ ...base, estoque: Math.trunc(d.estoque) });
  if (resp.error) return { erro: "Não foi possível salvar o item." };
  revalidatePath("/painel/itens");
  revalidatePath("/painel/lancamentos");
  return { ok: true };
}

export async function excluirItem(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  // ativo=false preserva o historico de vendas (lancamento_itens tem RESTRICT).
  const { error } = await supabase.from("itens").update({ ativo: false }).eq("id", id);
  if (error) return { erro: "Não foi possível remover o item." };
  revalidatePath("/painel/itens");
  revalidatePath("/painel/lancamentos");
  return { ok: true };
}

export async function excluirItemForm(id: string) {
  await excluirItem(id);
}

export async function reporEstoque(id: string, quantidade: number, pago: number) {
  if (!Number.isFinite(quantidade) || quantidade === 0) return { erro: "Informe a quantidade a repor (ou tirar)." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { data: item } = await supabase.from("itens").select("estoque, nome").eq("id", id).maybeSingle();
  if (!item) return { erro: "Item não encontrado." };
  const { error } = await supabase.from("itens").update({ estoque: Math.trunc(Number(item.estoque) + quantidade) }).eq("id", id);
  if (error) return { erro: "Não foi possível atualizar o estoque." };
  if (pago > 0) {
    const { error: eDesp } = await supabase.from("lancamentos").insert({
      negocio_id: g.negocio.id, tipo: "saida", carteira: "empresa", eh_retirada: false,
      valor: pago, descricao: `Compra de estoque · ${item.nome}`, data: hojeSP(), categoria_id: null,
    });
    if (eDesp) return { erro: "Estoque atualizado, mas não foi possível lançar a despesa." };
  }
  revalidatePath("/painel/itens");
  revalidatePath("/painel");
  return { ok: true };
}
```

- [ ] **Step 2: Form (client) — criar/editar e repor**

Create `src/app/painel/itens/FormItem.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarItem, reporEstoque } from "@/app/painel/itens/acoes";
import { parseValorBRL } from "@/lib/formato";

interface Inicial { id: string; nome: string; preco: number; unidade: string; controla_estoque: boolean; estoque_minimo: number }

const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

export function FormItem({ inicial }: { inicial?: Inicial }) {
  const ed = Boolean(inicial?.id);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [preco, setPreco] = useState(inicial ? String(inicial.preco).replace(".", ",") : "");
  const [unidade, setUnidade] = useState(inicial?.unidade ?? "un");
  const [controla, setControla] = useState(inicial?.controla_estoque ?? true);
  const [estoque, setEstoque] = useState("0");
  const [minimo, setMinimo] = useState(inicial ? String(inicial.estoque_minimo) : "0");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarItem({
        id: inicial?.id, nome, preco: parseValorBRL(preco), unidade,
        controla_estoque: controla, estoque: parseInt(estoque || "0", 10),
        estoque_minimo: parseInt(minimo || "0", 10),
      });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Item salvo!");
      if (!ed) { setNome(""); setPreco(""); setUnidade("un"); setControla(true); setEstoque("0"); setMinimo("0"); }
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">{ed ? "Editar item" : "Novo item"}</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do item" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="Preço 0,00" className={campo} />
        <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Unidade (un, kg...)" className={campo} />
      </div>
      <label className="flex items-center gap-2 text-sm text-texto">
        <input type="checkbox" checked={controla} onChange={(e) => setControla(e.target.checked)} /> Controlar estoque deste item
      </label>
      {controla && (
        <div className="grid grid-cols-2 gap-2">
          {!ed && <input value={estoque} onChange={(e) => setEstoque(e.target.value)} inputMode="numeric" placeholder="Estoque inicial" className={campo} />}
          <input value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="numeric" placeholder="Estoque mínimo" className={campo} />
        </div>
      )}
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}

export function FormRepor({ id }: { id: string }) {
  const [qtd, setQtd] = useState("");
  const [pago, setPago] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function repor(sinal: 1 | -1) {
    const q = parseInt(qtd || "0", 10);
    if (!q) { setMsg("Informe a quantidade."); return; }
    setMsg(null);
    iniciar(async () => {
      const r = await reporEstoque(id, sinal * q, sinal === 1 ? parseValorBRL(pago) : 0);
      if (!r?.erro) { setQtd(""); setPago(""); }
      setMsg(r?.erro ?? (sinal === 1 ? "Estoque reposto!" : "Baixa registrada."));
    });
  }

  return (
    <div className="flex flex-col gap-2 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" placeholder="Quantidade" className={campo} />
        <input value={pago} onChange={(e) => setPago(e.target.value)} inputMode="decimal" placeholder="Paguei (opcional)" className={campo} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => repor(1)} disabled={pendente}
          className="flex-1 border border-entrada px-3 py-2 text-sm font-semibold uppercase tracking-wider text-entrada transition-colors hover:bg-entrada hover:text-white disabled:opacity-60">Repor</button>
        <button type="button" onClick={() => repor(-1)} disabled={pendente}
          className="flex-1 border border-borda px-3 py-2 text-sm font-semibold uppercase tracking-wider text-texto-suave transition-colors hover:text-saida disabled:opacity-60">Tirar (perda)</button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página**

Create `src/app/painel/itens/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { estaAcabando } from "@/lib/estoque/calculos";
import { FormItem, FormRepor } from "@/app/painel/itens/FormItem";
import { excluirItemForm } from "@/app/painel/itens/acoes";

export default async function Itens() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_estoque) redirect("/painel");
  const supabase = criarClienteServidor();
  const { data: itens } = await supabase
    .from("itens").select("id, nome, preco, unidade, controla_estoque, estoque, estoque_minimo")
    .eq("negocio_id", negocio.id).eq("tipo", "venda").eq("ativo", true).order("nome");

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Itens</h1>
      <FormItem />
      <ul className="border border-borda bg-superficie">
        {(itens ?? []).map((it, idx, arr) => {
          const acabando = estaAcabando(Number(it.estoque), Number(it.estoque_minimo), it.controla_estoque);
          return (
            <li key={it.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{it.nome}</p>
                  <p className="text-xs text-texto-suave">
                    {formatarBRL(Number(it.preco))} / {it.unidade}
                    {it.controla_estoque && <> · estoque <span className={acabando ? "text-saida" : "text-texto"}>{it.estoque}</span>{acabando ? " (acabando)" : ""}</>}
                  </p>
                </div>
                <form action={excluirItemForm.bind(null, it.id)}>
                  <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                </form>
              </div>
              <details className="border-t border-borda">
                <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                <div className="p-4"><FormItem inicial={{ id: it.id, nome: it.nome, preco: Number(it.preco), unidade: it.unidade, controla_estoque: it.controla_estoque, estoque_minimo: Number(it.estoque_minimo) }} /></div>
              </details>
              {it.controla_estoque && (
                <details className="border-t border-borda">
                  <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Repor / tirar estoque</summary>
                  <div className="px-4 pb-4"><FormRepor id={it.id} /></div>
                </details>
              )}
            </li>
          );
        })}
        {(itens ?? []).length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhum item ainda.</li>}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Navegação — item "Itens" + threading de `usa_estoque`**

Modify `src/lib/nav/itens.tsx` — importar `Package`, estender `Flags` para `{ usa_carteiras, usa_fiado, usa_estoque }`, e adicionar o bloco:
```tsx
  if (flags.usa_estoque) {
    itens.push({ href: "/painel/itens", rotulo: "Itens", Icone: Package });
  }
```
Coloque esse bloco logo após o bloco `if (flags.usa_fiado) { ... }`. Adicione `Package` ao import de `lucide-react`.

Modify `src/components/nav/Sidebar.tsx` e `src/components/nav/DrawerNav.tsx` — **LEIA cada arquivo primeiro**; adicione a prop `usaEstoque: boolean` e troque a chamada para `itensNav({ usa_carteiras: usaCarteiras, usa_fiado: usaFiado, usa_estoque: usaEstoque })`.

Modify `src/app/painel/layout.tsx` — passar `usaEstoque={negocio.usa_estoque}` para `<Sidebar>` e `<DrawerNav>`.

- [ ] **Step 5: Build + testes**

Run: `npm run build` (se `.next` der erro transitório do OneDrive: `rm -rf .next` e repetir) e `npm test` → verdes.

- [ ] **Step 6: Commit**

```bash
git add src/app/painel/itens src/lib/nav/itens.tsx src/components/nav/Sidebar.tsx src/components/nav/DrawerNav.tsx src/app/painel/layout.tsx
git commit -m "feat: catalogo de itens (CRUD, repor com despesa opcional) + nav gated usa_estoque"
```

---

### Task 3: Venda com itens (FormLancamento + registrarVenda) + prova viva

**Files:**
- Modify: `src/app/painel/lancamentos/acoes.ts`, `src/app/painel/lancamentos/FormLancamento.tsx`, `src/app/painel/lancamentos/page.tsx`, `scripts/verificar-resumo.mjs`

**Interfaces:**
- Consumes: `totalVenda`/`descricaoItens` (Task 1), `resolverLancamento`, `hojeSP`, `negocioAtual`.
- Produces: server action `registrarVenda`.

- [ ] **Step 1: Server action `registrarVenda`**

Modify `src/app/painel/lancamentos/acoes.ts` — adicionar (mantém `salvarLancamento`/`excluirLancamento`):
```ts
export interface LinhaVendaInput { item_id: string; quantidade: number }

export async function registrarVenda(d: { itens: LinhaVendaInput[]; categoria_id: string | null; data: string }) {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  if (!negocio.usa_estoque) return { erro: "Estoque está desativado nas configurações." };
  const linhas = d.itens.filter((i) => i.item_id && i.quantidade > 0);
  if (!linhas.length) return { erro: "Adicione ao menos um item com quantidade." };
  if (d.data > hojeSP()) return { erro: "A data não pode ser futura." };
  const supabase = criarClienteServidor();

  // Precos autoritativos do servidor (nunca confiar no cliente).
  const ids = [...new Set(linhas.map((l) => l.item_id))];
  const { data: itens } = await supabase
    .from("itens").select("id, nome, preco").eq("negocio_id", negocio.id).eq("ativo", true).in("id", ids);
  const mapa = new Map((itens ?? []).map((i) => [i.id, i]));
  if (mapa.size !== ids.length) return { erro: "Algum item não foi encontrado." };

  const detalhes = linhas.map((l) => {
    const it = mapa.get(l.item_id)!;
    return { item_id: l.item_id, quantidade: Math.trunc(l.quantidade), preco_unitario: Number(it.preco), nome: it.nome };
  });
  const valor = Math.round(detalhes.reduce((a, x) => a + x.quantidade * x.preco_unitario, 0) * 100) / 100;
  const descricao = detalhes.map((x) => `${x.quantidade}× ${x.nome}`).join(", ");

  const { data: lanc, error: eLanc } = await supabase.from("lancamentos").insert({
    negocio_id: negocio.id, tipo: "entrada", carteira: "empresa", eh_retirada: false,
    valor, descricao, data: d.data, categoria_id: d.categoria_id,
  }).select("id").single();
  if (eLanc || !lanc) return { erro: "Não foi possível registrar a venda." };

  const { error: eItens } = await supabase.from("lancamento_itens").insert(
    detalhes.map((x) => ({ lancamento_id: lanc.id, item_id: x.item_id, quantidade: x.quantidade, preco_unitario: x.preco_unitario })),
  );
  if (eItens) {
    // Rollback: sem os itens, a venda ficaria sem baixa de estoque.
    await supabase.from("lancamentos").delete().eq("id", lanc.id);
    return { erro: "Não foi possível registrar os itens da venda." };
  }
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
  revalidatePath("/painel/itens");
  return { ok: true };
}
```

- [ ] **Step 2: FormLancamento com itens**

Modify `src/app/painel/lancamentos/FormLancamento.tsx` — versão completa nova:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarLancamento, registrarVenda } from "@/app/painel/lancamentos/acoes";
import { parseValorBRL, formatarBRL } from "@/lib/formato";
import { totalVenda } from "@/lib/estoque/calculos";
import type { TipoUI, Carteira } from "@/lib/caixa/lancamento";

interface Categoria { id: string; nome: string; tipo: "entrada" | "saida" }
interface ItemVenda { id: string; nome: string; preco: number; unidade: string; estoque: number; controla_estoque: boolean }
interface Linha { item_id: string; quantidade: string }

export function FormLancamento({
  categorias, usaCarteiras, hoje, usaEstoque = false, itensVenda = [],
}: { categorias: Categoria[]; usaCarteiras: boolean; hoje: string; usaEstoque?: boolean; itensVenda?: ItemVenda[] }) {
  const [tipoUI, setTipoUI] = useState<TipoUI>("entrada");
  const [carteira, setCarteira] = useState<Carteira>("empresa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje);
  const [categoriaId, setCategoriaId] = useState("");
  const [comItens, setComItens] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([{ item_id: "", quantidade: "1" }]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const tipoCategoria = tipoUI === "entrada" ? "entrada" : "saida";
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoCategoria);
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";
  const mapaItem = new Map(itensVenda.map((i) => [i.id, i]));
  const modoVenda = usaEstoque && tipoUI === "entrada" && comItens;

  const linhasResolvidas = linhas
    .map((l) => ({ ...l, item: mapaItem.get(l.item_id), qtd: parseInt(l.quantidade || "0", 10) }))
    .filter((l) => l.item && l.qtd > 0);
  const total = totalVenda(linhasResolvidas.map((l) => ({ quantidade: l.qtd, preco: l.item!.preco })));

  function setLinha(i: number, patch: Partial<Linha>) {
    setLinhas((xs) => xs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function enviar() {
    setErro(null);
    iniciar(async () => {
      if (modoVenda) {
        const itens = linhasResolvidas.map((l) => ({ item_id: l.item_id, quantidade: l.qtd }));
        if (!itens.length) { setErro("Adicione ao menos um item."); return; }
        const r = await registrarVenda({ itens, categoria_id: categoriaId || null, data });
        if (r?.erro) { setErro(r.erro); return; }
        setComItens(false); setLinhas([{ item_id: "", quantidade: "1" }]); setCategoriaId("");
      } else {
        const r = await salvarLancamento({
          tipoUI, carteira, valor: parseValorBRL(valor), descricao, data, categoria_id: categoriaId || null,
        });
        if (r?.erro) { setErro(r.erro); return; }
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["entrada", "saida", ...(usaCarteiras ? ["retirada"] as const : [])] as TipoUI[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTipoUI(t); setCategoriaId(""); if (t !== "entrada") setComItens(false); }}
            className={`flex-1 border px-2 py-2 text-sm capitalize ${tipoUI === t ? "border-marca bg-marca text-white" : "border-borda text-texto-suave"}`}>
            {t}
          </button>
        ))}
      </div>

      {usaEstoque && tipoUI === "entrada" && (
        <label className="flex items-center gap-2 text-sm text-texto">
          <input type="checkbox" checked={comItens} onChange={(e) => setComItens(e.target.checked)} /> Vender itens do catálogo (baixa o estoque)
        </label>
      )}

      {modoVenda ? (
        <div className="flex flex-col gap-2 border border-borda p-3">
          {linhas.map((l, i) => {
            const it = mapaItem.get(l.item_id);
            const qtd = parseInt(l.quantidade || "0", 10);
            const faltando = it && it.controla_estoque && qtd > it.estoque;
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <select value={l.item_id} onChange={(e) => setLinha(i, { item_id: e.target.value })} className={`${campo} flex-1`}>
                    <option value="">Escolha um item</option>
                    {itensVenda.map((iv) => <option key={iv.id} value={iv.id}>{iv.nome} — {formatarBRL(iv.preco)}</option>)}
                  </select>
                  <input value={l.quantidade} onChange={(e) => setLinha(i, { quantidade: e.target.value })} inputMode="numeric" className={`${campo} w-20`} placeholder="Qtd" />
                  {linhas.length > 1 && <button type="button" onClick={() => setLinhas((xs) => xs.filter((_, idx) => idx !== i))} className="px-2 text-texto-suave hover:text-saida">×</button>}
                </div>
                {faltando && <p className="text-xs text-saida">Estoque insuficiente (tem {it!.estoque}, vendendo {qtd}) — a venda registra mesmo assim.</p>}
              </div>
            );
          })}
          <button type="button" onClick={() => setLinhas((xs) => [...xs, { item_id: "", quantidade: "1" }])} className="self-start text-xs uppercase tracking-wider text-marca hover:opacity-80">+ adicionar item</button>
          <p className="border-t border-borda pt-2 text-sm">Total: <span className="font-semibold tabular-nums text-entrada">{formatarBRL(total)}</span></p>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">Valor
            <input className={campo} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </label>
          <label className="flex flex-col gap-1 text-sm">Descrição
            <input className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">Data
        <input type="date" max={hoje} className={campo} value={data} onChange={(e) => setData(e.target.value)} />
      </label>

      {tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Categoria
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categoriasFiltradas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      )}

      {usaCarteiras && !modoVenda && tipoUI !== "retirada" && (
        <label className="flex flex-col gap-1 text-sm">Carteira
          <select className={campo} value={carteira} onChange={(e) => setCarteira(e.target.value as Carteira)}>
            <option value="empresa">Empresa</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </label>
      )}

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      <button type="button" onClick={enviar} disabled={pendente}
        className="bg-marca px-4 py-2 font-semibold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60">
        {pendente ? "Salvando..." : modoVenda ? "Registrar venda" : "Salvar lançamento"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Passar itens à página de lançamentos**

Modify `src/app/painel/lancamentos/page.tsx`:
1. Após a query de `categorias`, buscar os itens de venda ativos quando `usa_estoque`:
```tsx
  const { data: itensVenda } = negocio.usa_estoque
    ? await supabase.from("itens").select("id, nome, preco, unidade, estoque, controla_estoque")
        .eq("negocio_id", negocio.id).eq("tipo", "venda").eq("ativo", true).order("nome")
    : { data: [] };
```
2. Passar as novas props ao form:
```tsx
          <FormLancamento categorias={categorias ?? []} usaCarteiras={negocio.usa_carteiras} hoje={hojeStr}
            usaEstoque={negocio.usa_estoque}
            itensVenda={(itensVenda ?? []).map((i) => ({ ...i, preco: Number(i.preco) }))} />
```

- [ ] **Step 4: Prova viva (estende verificar-resumo.mjs)**

Modify `scripts/verificar-resumo.mjs` — ANTES do bloco de cleanup, adicionar:
```js
// Fase 5A: venda baixa estoque; excluir devolve.
const { data: it5, error: eIt5 } = await cli.from("itens")
  .insert({ negocio_id: negId, nome: "Produto Teste", preco: 10, tipo: "venda", controla_estoque: true, estoque: 40 })
  .select("id").single();
assert(!eIt5 && it5?.id, "criou item com estoque 40");
const { data: v5, error: eV5 } = await cli.from("lancamentos")
  .insert({ negocio_id: negId, tipo: "entrada", descricao: "venda itens", valor: 20, carteira: "empresa", eh_retirada: false })
  .select("id").single();
assert(!eV5 && v5?.id, "criou lancamento da venda");
await cli.from("lancamento_itens").insert({ lancamento_id: v5.id, item_id: it5.id, quantidade: 2, preco_unitario: 10 });
const { data: it5b } = await cli.from("itens").select("estoque").eq("id", it5.id).maybeSingle();
assert(Number(it5b.estoque) === 38, `venda de 2 baixou estoque 40->38 (veio ${it5b?.estoque})`);
await cli.from("lancamentos").delete().eq("id", v5.id);
const { data: it5c } = await cli.from("itens").select("estoque").eq("id", it5.id).maybeSingle();
assert(Number(it5c.estoque) === 40, `excluir a venda devolveu o estoque para 40 (veio ${it5c?.estoque})`);
```

- [ ] **Step 5: Build + testes + prova viva**

Run: `npm run build` e `npm test` → verdes. Depois que o usuário aplicar a 0010: `node scripts/verificar-resumo.mjs` → termina em `RESUMO OK` com as novas asserções.

- [ ] **Step 6: Commit**

```bash
git add src/app/painel/lancamentos scripts/verificar-resumo.mjs
git commit -m "feat: venda com itens (baixa estoque via trigger) + prova viva"
```

---

### Task 4: Alerta de estoque baixo no painel

**Files:**
- Modify: `src/app/painel/page.tsx`

**Interfaces:**
- Consumes: `negocioAtual().usa_estoque`, itens controlados.

- [ ] **Step 1: Query + banner**

Modify `src/app/painel/page.tsx`:
1. Após obter `resumo`/`metaMin` (Fase 4 já adicionou a busca de saldo mínimo), buscar os itens acabando quando `usa_estoque`:
```tsx
  let acabando = 0;
  if (negocio.usa_estoque) {
    const { data: itensCtrl } = await supabase.from("itens")
      .select("estoque, estoque_minimo").eq("negocio_id", negocio.id)
      .eq("ativo", true).eq("controla_estoque", true).gt("estoque_minimo", 0);
    acabando = (itensCtrl ?? []).filter((i) => Number(i.estoque) <= Number(i.estoque_minimo)).length;
  }
```
2. Como PRIMEIRO filho do `div.mx-auto...` (junto do alerta de saldo mínimo da Fase 4), adicionar:
```tsx
        {acabando > 0 && (
          <a href="/painel/itens" role="alert" className="border border-saida bg-superficie px-4 py-3 text-sm text-saida">
            {acabando === 1 ? "1 item está acabando." : `${acabando} itens estão acabando.`} Ver itens →
          </a>
        )}
```

- [ ] **Step 2: Build + testes**

Run: `npm run build` e `npm test` → verdes.

- [ ] **Step 3: Commit**

```bash
git add src/app/painel/page.tsx
git commit -m "feat: alerta de estoque baixo no painel"
```

---

## Self-Review (cobertura da spec)

- **Migration 0010 (estoque_minimo + trigger)** → Task 1. ✓
- **Cálculos puros (total, acabando, descrição) testados** → Task 1. ✓
- **Catálogo de itens (CRUD, ativo=false, repor com despesa opcional)** → Task 2. ✓
- **Nav gated usa_estoque** → Task 2. ✓
- **Venda com itens (baixa via trigger, aviso não-bloqueante, preço do servidor)** → Task 3. ✓
- **Excluir venda devolve estoque** → Task 3 (trigger no delete) + prova viva. ✓
- **Alerta de estoque baixo** → Task 4. ✓
- **Money-color** → preço neutro, total verde, despesa/acabando vinho, alerta vinho. ✓
- **Server-action safety** → `excluirItemForm` wrapper void; `excluirLancamento` já é void. ✓
