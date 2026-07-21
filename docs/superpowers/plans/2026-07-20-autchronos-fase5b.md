# Fase 5B — Locação (aluguel de itens) — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Passos usam checkbox (`- [ ]`).

**Goal:** Aluguel de itens: itens que saem para um cliente e voltam, com devolução prevista, reserva de estoque derivada e dinheiro escolhido na hora (caixa ou a receber).

**Architecture:** UI + server actions sobre o schema existente (`locacoes`, `itens` aluguel, `clientes`). **Sem migration** (o schema e os índices já existem). Reaproveita a tela de Itens (seção Aluguel) e Clientes (abertos também para locação). Reserva derivada = soma das locações abertas.

**Tech Stack:** Next.js 14 App Router (Server Components + Server Actions), Supabase (Postgres + RLS), Tailwind (tokens institucionais), Vitest.

## Global Constraints

- **Money-color rule:** navy (`text-marca`) NUNCA colore dinheiro. Valor da locação neutro (`text-texto`); entrada gerada verde no extrato; **locações atrasadas em `text-saida`**. Nunca opacidade em token var.
- **Server-action safety:** toda função em `<form action>` deve ser Server Action que retorna `void` — use wrappers void (`marcarDevolucaoForm`, `excluirLocacaoForm`) + `.bind`; nunca `.bind` de ação que retorna `{ok}|{erro}`, nunca closure inline.
- **Isolamento:** tudo via `negocioAtual()` (nunca confiar em id/preço do cliente) + RLS; gating server-side `usa_locacao` nas actions de locação.
- **Reserva derivada:** registrar/devolver locação NÃO altera `itens.estoque`. Disponível = `estoque − Σ(locações abertas do item)`.
- **Pagamento:** "Recebido agora" → entrada no caixa; "A receber" → linha em `receber` (só se `usa_fiado`); valor 0 → sem lançamento. Locação e dinheiro **desacoplados**.
- **Fuso:** `hojeSP()`. **Moeda:** `formatarBRL`/`parseValorBRL`. pt-BR.

## File Structure

- `src/lib/locacao/calculos.ts` (novo) — `disponivelAluguel`, `estaAtrasada` (puros).
- `src/lib/clientes/resolver.ts` (novo) — `resolverCliente` extraído (busca-ou-cria).
- `src/app/painel/a-receber/acoes.ts` (modificar) — passar a importar `resolverCliente`.
- `src/app/painel/itens/{page.tsx,FormItem.tsx,acoes.ts}` (modificar) — seção de aluguel.
- `src/lib/nav/itens.tsx`, `src/components/nav/Sidebar.tsx`, `DrawerNav.tsx`, `src/app/painel/layout.tsx` (modificar) — `usa_locacao` + itens de nav.
- `src/app/painel/clientes/{page.tsx,acoes.ts}` (modificar) — abrir para locação.
- `src/app/painel/locacoes/{page.tsx,acoes.ts,FormLocacao.tsx}` (novo) — tela de locação.
- `scripts/verificar-resumo.mjs` (modificar) — prova viva.

---

### Task 1: Cálculos puros de locação + helper `resolverCliente` compartilhado

**Files:**
- Create: `src/lib/locacao/calculos.ts`, `src/lib/clientes/resolver.ts`
- Modify: `src/app/painel/a-receber/acoes.ts`
- Test: `tests/locacao-calculos.test.ts`

**Interfaces:**
- Produces: `disponivelAluguel(estoque, reservado)`, `estaAtrasada(devolucaoPrevista, devolvidoEm, hoje)`; `resolverCliente(supabase, negocioId, nome)`.

- [ ] **Step 1: Teste dos cálculos (falha primeiro)**

Create `tests/locacao-calculos.test.ts`:
```ts
import { disponivelAluguel, estaAtrasada } from "@/lib/locacao/calculos";

test("disponivelAluguel = estoque − reservado (pode ficar negativo)", () => {
  expect(disponivelAluguel(3, 1)).toBe(2);
  expect(disponivelAluguel(3, 3)).toBe(0);
  expect(disponivelAluguel(3, 5)).toBe(-2);
});

test("estaAtrasada: aberta e vencida; devolvida ou no prazo não", () => {
  expect(estaAtrasada("2026-07-19", null, "2026-07-20")).toBe(true);
  expect(estaAtrasada("2026-07-20", null, "2026-07-20")).toBe(false);
  expect(estaAtrasada("2026-07-21", null, "2026-07-20")).toBe(false);
  expect(estaAtrasada("2026-07-19", "2026-07-19", "2026-07-20")).toBe(false); // já devolvida
});
```

- [ ] **Step 2: Rodar (deve falhar)**

Run: `npm test -- locacao-calculos`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar cálculos**

Create `src/lib/locacao/calculos.ts`:
```ts
export function disponivelAluguel(estoque: number, reservado: number): number {
  return estoque - reservado;
}

// Atrasada = ainda na rua (sem devolvido_em) e a devolucao prevista ja passou.
export function estaAtrasada(devolucaoPrevista: string, devolvidoEm: string | null, hoje: string): boolean {
  return !devolvidoEm && devolucaoPrevista < hoje;
}
```

- [ ] **Step 4: Rodar (deve passar)**

Run: `npm test -- locacao-calculos`
Expected: PASS (2 testes).

- [ ] **Step 5: Extrair `resolverCliente`**

Create `src/lib/clientes/resolver.ts`:
```ts
import { criarClienteServidor } from "@/lib/supabase/servidor";

type Cli = ReturnType<typeof criarClienteServidor>;

// Busca (case-insensitive) ou cria o cliente; devolve o id. A UNIQUE (0009)
// barra a corrida de duplo-clique -> re-busca no 23505.
export async function resolverCliente(supabase: Cli, negocioId: string, nome: string): Promise<string | null> {
  const { data: existente } = await supabase
    .from("clientes").select("id").eq("negocio_id", negocioId).ilike("nome", nome).maybeSingle();
  if (existente?.id) return existente.id;
  const { data: novo, error } = await supabase
    .from("clientes").insert({ negocio_id: negocioId, nome, tipo: "pessoa" }).select("id").single();
  if (novo?.id) return novo.id;
  if (error?.code === "23505") {
    const { data: r } = await supabase
      .from("clientes").select("id").eq("negocio_id", negocioId).ilike("nome", nome).maybeSingle();
    return r?.id ?? null;
  }
  return null;
}
```

Modify `src/app/painel/a-receber/acoes.ts`: remover a função local `resolverCliente` e importar a compartilhada:
```ts
import { resolverCliente } from "@/lib/clientes/resolver";
```
(As chamadas `resolverCliente(supabase, g.negocio.id, nomeCliente)` continuam iguais.)

- [ ] **Step 6: Build + testes**

Run: `npm test` e `npm run build` → verdes (o `resolverCliente` compartilhado mantém o "a receber" funcionando).

- [ ] **Step 7: Commit**

```bash
git add src/lib/locacao/calculos.ts src/lib/clientes/resolver.ts src/app/painel/a-receber/acoes.ts tests/locacao-calculos.test.ts
git commit -m "feat: calculos de locacao (disponivel, atrasada) + resolverCliente compartilhado"
```

---

### Task 2: Itens de aluguel (reaproveitar `/painel/itens`) + nav

**Files:**
- Modify: `src/app/painel/itens/acoes.ts`, `src/app/painel/itens/FormItem.tsx`, `src/app/painel/itens/page.tsx`, `src/lib/nav/itens.tsx`, `src/components/nav/Sidebar.tsx`, `src/components/nav/DrawerNav.tsx`, `src/app/painel/layout.tsx`

**Interfaces:**
- Consumes: `negocioAtual()` (tem `usa_estoque`/`usa_locacao`), `disponivelAluguel` (Task 1).
- Produces: `DadosItem` ganha `tipo`; `itensNav` passa a exigir `{ usa_carteiras, usa_fiado, usa_estoque, usa_locacao }`.

- [ ] **Step 1: `itens/acoes.ts` — gating e tipo**

Modify `src/app/painel/itens/acoes.ts`:
1. `guarda()` passa a aceitar estoque OU locação:
```ts
async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_estoque && !negocio.usa_locacao) return { negocio: null, erro: "Itens estão desativados nas configurações." as string };
  return { negocio, erro: "" };
}
```
2. `DadosItem` ganha `tipo`:
```ts
export interface DadosItem {
  id?: string; nome: string; preco: number; unidade: string; tipo: "venda" | "aluguel";
  controla_estoque: boolean; estoque: number; estoque_minimo: number;
}
```
3. Em `salvarItem`, validar o tipo contra a flag e gravar o tipo só na criação (o `base` NÃO leva `tipo`; só o insert):
```ts
export async function salvarItem(d: DadosItem) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "Informe o nome do item." };
  if (d.preco < 0) return { erro: "O preço não pode ser negativo." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  if (d.tipo === "venda" && !g.negocio.usa_estoque) return { erro: "Vendas com estoque estão desativadas." };
  if (d.tipo === "aluguel" && !g.negocio.usa_locacao) return { erro: "Aluguel está desativado." };
  const supabase = criarClienteServidor();
  const base = {
    negocio_id: g.negocio.id, nome, preco: d.preco, unidade: d.unidade.trim() || "un",
    controla_estoque: d.controla_estoque, estoque_minimo: Math.max(0, Math.trunc(d.estoque_minimo)),
  };
  const resp = d.id
    ? await supabase.from("itens").update(base).eq("id", d.id)
    : await supabase.from("itens").insert({ ...base, tipo: d.tipo, estoque: Math.trunc(d.estoque) });
  if (resp.error) return { erro: "Não foi possível salvar o item." };
  revalidatePath("/painel/itens");
  revalidatePath("/painel/lancamentos");
  revalidatePath("/painel");
  return { ok: true };
}
```
(Os `excluirItem`/`excluirItemForm`/`reporEstoque` ficam iguais.)

- [ ] **Step 2: `FormItem` — campo tipo**

Modify `src/app/painel/itens/FormItem.tsx`:
1. Assinatura ganha as flags e o tipo é state:
```tsx
interface Inicial { id: string; nome: string; preco: number; unidade: string; controla_estoque: boolean; estoque_minimo: number; tipo: "venda" | "aluguel" }

export function FormItem({ inicial, podeVenda = true, podeAluguel = false }: { inicial?: Inicial; podeVenda?: boolean; podeAluguel?: boolean }) {
  const ed = Boolean(inicial?.id);
  const [tipo, setTipo] = useState<"venda" | "aluguel">(inicial?.tipo ?? (podeVenda ? "venda" : "aluguel"));
  // ...demais states iguais...
```
2. No `salvar()`, incluir `tipo` no objeto de `salvarItem`.
3. Renderizar o seletor de tipo só na criação e só quando os dois são possíveis:
```tsx
      {!ed && podeVenda && podeAluguel && (
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "venda" | "aluguel")} className={campo}>
          <option value="venda">Venda</option>
          <option value="aluguel">Aluguel</option>
        </select>
      )}
```
(Coloque logo após o `<input>` do nome. Quando só um é possível, `tipo` já vem correto pelo default.)

- [ ] **Step 3: `itens/page.tsx` — seções venda + aluguel**

Modify `src/app/painel/itens/page.tsx` — versão nova:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { estaAcabando } from "@/lib/estoque/calculos";
import { disponivelAluguel } from "@/lib/locacao/calculos";
import { FormItem, FormRepor } from "@/app/painel/itens/FormItem";
import { excluirItemForm } from "@/app/painel/itens/acoes";

export default async function Itens() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_estoque && !negocio.usa_locacao) redirect("/painel");
  const supabase = criarClienteServidor();

  const { data: todos } = await supabase
    .from("itens").select("id, nome, preco, unidade, tipo, controla_estoque, estoque, estoque_minimo")
    .eq("negocio_id", negocio.id).eq("ativo", true).order("nome");
  const venda = (todos ?? []).filter((i) => i.tipo === "venda");
  const aluguel = (todos ?? []).filter((i) => i.tipo === "aluguel");

  // Reserva derivada por item (locacoes abertas).
  const reservaPorItem = new Map<string, number>();
  if (negocio.usa_locacao && aluguel.length) {
    const { data: abertas } = await supabase
      .from("locacoes").select("item_id, quantidade").eq("negocio_id", negocio.id).is("devolvido_em", null);
    for (const l of abertas ?? []) reservaPorItem.set(l.item_id, (reservaPorItem.get(l.item_id) ?? 0) + Number(l.quantidade));
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Itens</h1>
      <FormItem podeVenda={negocio.usa_estoque} podeAluguel={negocio.usa_locacao} />

      {negocio.usa_estoque && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Venda</h2>
          <ul className="mt-2 border border-borda bg-superficie">
            {venda.map((it, idx, arr) => {
              const alerta = estaAcabando(Number(it.estoque), Number(it.estoque_minimo), it.controla_estoque) || Number(it.estoque) < 0;
              return (
                <li key={it.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
                  <div className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-marca">{it.nome}</p>
                      <p className="text-xs text-texto-suave">
                        {formatarBRL(Number(it.preco))} / {it.unidade}
                        {it.controla_estoque && <> · estoque <span className={alerta ? "text-saida" : "text-texto"}>{it.estoque}</span>{alerta ? " (acabando)" : ""}</>}
                      </p>
                    </div>
                    <form action={excluirItemForm.bind(null, it.id)}>
                      <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                    </form>
                  </div>
                  <details className="border-t border-borda">
                    <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                    <div className="p-4"><FormItem podeVenda podeAluguel={false} inicial={{ id: it.id, nome: it.nome, preco: Number(it.preco), unidade: it.unidade, controla_estoque: it.controla_estoque, estoque_minimo: Number(it.estoque_minimo), tipo: "venda" }} /></div>
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
            {venda.length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhum item de venda.</li>}
          </ul>
        </div>
      )}

      {negocio.usa_locacao && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Aluguel</h2>
          <ul className="mt-2 border border-borda bg-superficie">
            {aluguel.map((it, idx, arr) => {
              const reservado = reservaPorItem.get(it.id) ?? 0;
              const disp = disponivelAluguel(Number(it.estoque), reservado);
              return (
                <li key={it.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
                  <div className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-marca">{it.nome}</p>
                      <p className="text-xs text-texto-suave">
                        {formatarBRL(Number(it.preco))} / {it.unidade} · possui {it.estoque} · disponível <span className={disp < 0 ? "text-saida" : "text-texto"}>{disp}</span>
                      </p>
                    </div>
                    <form action={excluirItemForm.bind(null, it.id)}>
                      <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                    </form>
                  </div>
                  <details className="border-t border-borda">
                    <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                    <div className="p-4"><FormItem podeVenda={false} podeAluguel inicial={{ id: it.id, nome: it.nome, preco: Number(it.preco), unidade: it.unidade, controla_estoque: it.controla_estoque, estoque_minimo: Number(it.estoque_minimo), tipo: "aluguel" }} /></div>
                  </details>
                  <details className="border-t border-borda">
                    <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Ajustar unidades</summary>
                    <div className="px-4 pb-4"><FormRepor id={it.id} /></div>
                  </details>
                </li>
              );
            })}
            {aluguel.length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhum item de aluguel.</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Navegação — "Itens" gated `usa_estoque || usa_locacao` + threading `usa_locacao`**

Modify `src/lib/nav/itens.tsx`:
- `Flags` ganha `usa_locacao`.
- O item "Itens" passa para um bloco `if (flags.usa_estoque || flags.usa_locacao)` (em vez de só `usa_estoque`):
```tsx
  if (flags.usa_estoque || flags.usa_locacao) {
    itens.push({ href: "/painel/itens", rotulo: "Itens", Icone: Package });
  }
```

Modify `src/components/nav/Sidebar.tsx` e `DrawerNav.tsx` — **LEIA cada arquivo**; adicionar prop `usaLocacao: boolean` e passar `usa_locacao: usaLocacao` ao `itensNav({ ... })`.

Modify `src/app/painel/layout.tsx` — passar `usaLocacao={negocio.usa_locacao}` para `<Sidebar>` e `<DrawerNav>`.

- [ ] **Step 5: Build + testes**

Run: `npm run build` (se `.next` der erro OneDrive: `rm -rf .next` e repetir) e `npm test` → verdes.

- [ ] **Step 6: Commit**

```bash
git add src/app/painel/itens src/lib/nav/itens.tsx src/components/nav/Sidebar.tsx src/components/nav/DrawerNav.tsx src/app/painel/layout.tsx
git commit -m "feat: itens de aluguel na tela de itens (secao Aluguel, disponivel derivado) + nav"
```

---

### Task 3: Clientes abrem também para locação

**Files:**
- Modify: `src/lib/nav/itens.tsx`, `src/app/painel/clientes/page.tsx`, `src/app/painel/clientes/acoes.ts`

**Interfaces:**
- Consumes: `negocioAtual()` (`usa_fiado`/`usa_locacao`).

- [ ] **Step 1: Nav — clientes com `usa_fiado || usa_locacao`**

Modify `src/lib/nav/itens.tsx` — o item "Clientes" (hoje dentro de `if (flags.usa_fiado)`) passa a aparecer com `usa_fiado || usa_locacao`. Se "A receber" e "Clientes" estão no mesmo bloco `if (flags.usa_fiado)`, separe: "A receber" continua só com `usa_fiado`; "Clientes" ganha bloco próprio:
```tsx
  if (flags.usa_fiado) {
    itens.push({ href: "/painel/a-receber", rotulo: "A receber", Icone: HandCoins });
  }
  if (flags.usa_fiado || flags.usa_locacao) {
    itens.push({ href: "/painel/clientes", rotulo: "Clientes", Icone: Users });
  }
```

- [ ] **Step 2: Página e action de clientes**

Modify `src/app/painel/clientes/page.tsx` — trocar o guard:
```tsx
  if (!negocio.usa_fiado && !negocio.usa_locacao) redirect("/painel");
```

Modify `src/app/painel/clientes/acoes.ts` — na função `guarda()`, trocar a checagem:
```ts
  if (!negocio.usa_fiado && !negocio.usa_locacao) return { negocio: null, erro: "Clientes estão desativados nas configurações." as string };
```
Também em `excluirCliente`, além de checar `receber`, checar **locações abertas** antes de excluir:
```ts
  const { count: nLoc } = await supabase
    .from("locacoes").select("id", { count: "exact", head: true }).eq("cliente_id", id).is("devolvido_em", null);
  if ((nLoc ?? 0) > 0) return { erro: "Esse cliente tem locações em aberto. Registre a devolução antes." };
```
(Coloque essa checagem logo após a checagem de `receber` já existente.)

- [ ] **Step 3: Build + testes**

Run: `npm run build` e `npm test` → verdes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/nav/itens.tsx src/app/painel/clientes
git commit -m "feat: clientes abrem para locacao (gating usa_fiado OU usa_locacao) + guarda de locacao aberta"
```

---

### Task 4: Tela de Locação + prova viva

**Files:**
- Create: `src/app/painel/locacoes/acoes.ts`, `src/app/painel/locacoes/FormLocacao.tsx`, `src/app/painel/locacoes/page.tsx`
- Modify: `src/lib/nav/itens.tsx`, `scripts/verificar-resumo.mjs`

**Interfaces:**
- Consumes: `resolverCliente` (Task 1), `disponivelAluguel`/`estaAtrasada` (Task 1), `hojeSP`, `negocioAtual`, `formatarBRL`/`parseValorBRL`.
- Produces: server actions `registrarLocacao`, `marcarDevolucao`+`marcarDevolucaoForm`, `excluirLocacao`+`excluirLocacaoForm`; item de nav "Locações".

- [ ] **Step 1: Server actions**

Create `src/app/painel/locacoes/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { resolverCliente } from "@/lib/clientes/resolver";

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_locacao) return { negocio: null, erro: "Locação está desativada nas configurações." as string };
  return { negocio, erro: "" };
}

export interface DadosLocacao {
  cliente: string; item_id: string; quantidade: number; valor: number;
  data_retirada: string; devolucao_prevista: string;
  pagamento: "recebido" | "receber" | "nenhum";
}

export async function registrarLocacao(d: DadosLocacao) {
  if (!d.cliente.trim()) return { erro: "Informe o cliente." };
  if (!d.item_id) return { erro: "Escolha um item." };
  if (d.quantidade <= 0) return { erro: "Informe a quantidade." };
  if (d.valor < 0) return { erro: "O valor não pode ser negativo." };
  if (!d.devolucao_prevista) return { erro: "Informe a devolução prevista." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  if (d.pagamento === "receber" && !g.negocio.usa_fiado) return { erro: "\"A receber\" exige o módulo de fiado ativo." };
  const supabase = criarClienteServidor();

  const { data: item } = await supabase
    .from("itens").select("nome").eq("id", d.item_id).eq("negocio_id", g.negocio.id).eq("tipo", "aluguel").eq("ativo", true).maybeSingle();
  if (!item) return { erro: "Item de aluguel não encontrado." };

  const clienteId = await resolverCliente(supabase, g.negocio.id, d.cliente.trim());
  if (!clienteId) return { erro: "Não foi possível salvar o cliente." };

  const { error: eLoc } = await supabase.from("locacoes").insert({
    negocio_id: g.negocio.id, item_id: d.item_id, cliente_id: clienteId,
    quantidade: Math.trunc(d.quantidade), valor: d.valor,
    data_retirada: d.data_retirada || hojeSP(), devolucao_prevista: d.devolucao_prevista,
  });
  if (eLoc) return { erro: "Não foi possível registrar a locação." };

  if (d.valor > 0 && d.pagamento === "recebido") {
    await supabase.from("lancamentos").insert({
      negocio_id: g.negocio.id, tipo: "entrada", carteira: "empresa", eh_retirada: false,
      valor: d.valor, descricao: `Aluguel · ${item.nome}`, data: d.data_retirada || hojeSP(), categoria_id: null,
    });
  } else if (d.valor > 0 && d.pagamento === "receber") {
    await supabase.from("receber").insert({
      negocio_id: g.negocio.id, cliente_id: clienteId, descricao: `Aluguel · ${item.nome}`,
      valor: d.valor, vencimento: d.devolucao_prevista, taxa: 0,
    });
  }
  revalidatePath("/painel/locacoes");
  revalidatePath("/painel/itens");
  revalidatePath("/painel");
  return { ok: true };
}

async function setDevolucao(id: string, devolvido: boolean) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("locacoes").update({ devolvido_em: devolvido ? hojeSP() : null }).eq("id", id);
  if (error) return { erro: "Não foi possível atualizar a locação." };
  revalidatePath("/painel/locacoes");
  revalidatePath("/painel/itens");
  return { ok: true };
}

export const marcarDevolucao = (id: string) => setDevolucao(id, true);

export async function excluirLocacao(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  // Nao mexe no dinheiro ja lancado (registro desacoplado).
  const { error } = await supabase.from("locacoes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir a locação." };
  revalidatePath("/painel/locacoes");
  revalidatePath("/painel/itens");
  return { ok: true };
}

export async function marcarDevolucaoForm(id: string) { await marcarDevolucao(id); }
export async function excluirLocacaoForm(id: string) { await excluirLocacao(id); }
```

- [ ] **Step 2: Form (client)**

Create `src/app/painel/locacoes/FormLocacao.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { registrarLocacao, type DadosLocacao } from "@/app/painel/locacoes/acoes";
import { parseValorBRL } from "@/lib/formato";
import { disponivelAluguel } from "@/lib/locacao/calculos";

interface ItemAluguel { id: string; nome: string; preco: number; estoque: number; reservado: number }

export function FormLocacao({ itens, nomesClientes, usaFiado, hoje }: {
  itens: ItemAluguel[]; nomesClientes: string[]; usaFiado: boolean; hoje: string;
}) {
  const [cliente, setCliente] = useState("");
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("1");
  const [valor, setValor] = useState("");
  const [retirada, setRetirada] = useState(hoje);
  const [prevista, setPrevista] = useState("");
  const [pagamento, setPagamento] = useState<DadosLocacao["pagamento"]>("recebido");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  const item = itens.find((i) => i.id === itemId);
  const q = parseInt(qtd || "0", 10);
  const disp = item ? disponivelAluguel(item.estoque, item.reservado) : 0;
  const faltando = item && q > disp;

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await registrarLocacao({
        cliente, item_id: itemId, quantidade: q, valor: parseValorBRL(valor),
        data_retirada: retirada, devolucao_prevista: prevista, pagamento,
      });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Locação registrada!");
      setCliente(""); setItemId(""); setQtd("1"); setValor(""); setPrevista(""); setPagamento("recebido");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input list="lista-clientes-loc" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" className={campo} />
      <datalist id="lista-clientes-loc">{nomesClientes.map((n) => <option key={n} value={n} />)}</datalist>
      <div className="grid grid-cols-2 gap-2">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={campo}>
          <option value="">Escolha o item</option>
          {itens.map((i) => <option key={i.id} value={i.id}>{i.nome} (disp. {disponivelAluguel(i.estoque, i.reservado)})</option>)}
        </select>
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" placeholder="Qtd" className={campo} />
      </div>
      {faltando && <p className="text-xs text-saida">Disponível insuficiente (tem {disp}, alugando {q}) — registra mesmo assim.</p>}
      <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor 0,00" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-texto-suave">Retirada
          <input type="date" value={retirada} onChange={(e) => setRetirada(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-texto-suave">Devolução prevista
          <input type="date" value={prevista} onChange={(e) => setPrevista(e.target.value)} className={campo} />
        </label>
      </div>
      <select value={pagamento} onChange={(e) => setPagamento(e.target.value as DadosLocacao["pagamento"])} className={campo}>
        <option value="recebido">Recebido agora (entra no caixa)</option>
        {usaFiado && <option value="receber">A receber</option>}
        <option value="nenhum">Não lançar agora</option>
      </select>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Registrar locação"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página**

Create `src/app/painel/locacoes/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { hojeSP } from "@/lib/caixa/periodo";
import { estaAtrasada } from "@/lib/locacao/calculos";
import { FormLocacao } from "@/app/painel/locacoes/FormLocacao";
import { marcarDevolucaoForm, excluirLocacaoForm } from "@/app/painel/locacoes/acoes";

type Linha = {
  id: string; quantidade: number; valor: number; data_retirada: string;
  devolucao_prevista: string; devolvido_em: string | null;
  itens: { nome: string } | null; clientes: { nome: string } | null;
};

export default async function Locacoes({ searchParams }: { searchParams: { novo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_locacao) redirect("/painel");
  const supabase = criarClienteServidor();
  const hoje = hojeSP();
  const sel = "id, quantidade, valor, data_retirada, devolucao_prevista, devolvido_em, itens(nome), clientes(nome)";

  const [{ data: itensRaw }, { data: abertasRaw }, { data: clientes }, { data: devolvidasRaw }] = await Promise.all([
    supabase.from("itens").select("id, nome, preco, estoque").eq("negocio_id", negocio.id).eq("tipo", "aluguel").eq("ativo", true).order("nome"),
    supabase.from("locacoes").select(sel).eq("negocio_id", negocio.id).is("devolvido_em", null).order("devolucao_prevista"),
    supabase.from("clientes").select("nome").eq("negocio_id", negocio.id).order("nome"),
    supabase.from("locacoes").select(sel).eq("negocio_id", negocio.id).not("devolvido_em", "is", null).order("devolvido_em", { ascending: false }).limit(100),
  ]);

  // Reserva (locacoes abertas) por item para o disponivel no form.
  const reservaPorItem = new Map<string, number>();
  const { data: abertasQtd } = await supabase.from("locacoes").select("item_id, quantidade").eq("negocio_id", negocio.id).is("devolvido_em", null);
  for (const l of abertasQtd ?? []) reservaPorItem.set(l.item_id, (reservaPorItem.get(l.item_id) ?? 0) + Number(l.quantidade));

  const itens = (itensRaw ?? []).map((i) => ({ id: i.id, nome: i.nome, preco: Number(i.preco), estoque: Number(i.estoque), reservado: reservaPorItem.get(i.id) ?? 0 }));
  const abertas = (abertasRaw ?? []) as unknown as Linha[];
  const devolvidas = (devolvidasRaw ?? []) as unknown as Linha[];
  const nomes = (clientes ?? []).map((c) => c.nome);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Locações</h1>

      <details open={searchParams?.novo === "1"} className="border border-borda bg-superficie">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Nova locação</summary>
        <div className="border-t border-borda p-4"><FormLocacao itens={itens} nomesClientes={nomes} usaFiado={negocio.usa_fiado} hoje={hoje} /></div>
      </details>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Na rua</h2>
      <ul className="border border-borda bg-superficie">
        {abertas.map((l, idx, arr) => {
          const atrasada = estaAtrasada(l.devolucao_prevista, l.devolvido_em, hoje);
          return (
            <li key={l.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{l.itens?.nome ?? "—"} · {l.clientes?.nome ?? "—"} {l.quantidade > 1 ? `(${l.quantidade})` : ""}</p>
                  <p className="text-xs text-texto-suave">
                    <span className={atrasada ? "text-saida" : ""}>devolver {l.devolucao_prevista}{atrasada ? " (atrasada)" : ""}</span> · {formatarBRL(Number(l.valor))}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-borda px-5 py-2">
                <form action={marcarDevolucaoForm.bind(null, l.id)}>
                  <button type="submit" className="text-xs font-semibold uppercase tracking-wider text-entrada hover:opacity-80">Marcar devolução</button>
                </form>
                <form action={excluirLocacaoForm.bind(null, l.id)}>
                  <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                </form>
              </div>
            </li>
          );
        })}
        {abertas.length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhuma locação em aberto.</li>}
      </ul>

      {devolvidas.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-texto-suave">Devolvidas</h2>
          <ul className="border border-borda bg-superficie">
            {devolvidas.map((l, idx, arr) => (
              <li key={l.id} className={`flex items-center justify-between px-5 py-3 text-sm ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
                <div>
                  <p className="text-marca">{l.itens?.nome ?? "—"} · {l.clientes?.nome ?? "—"}</p>
                  <p className="text-xs text-texto-suave">devolvida {l.devolvido_em}</p>
                </div>
                <span className="tabular-nums text-texto-suave">{formatarBRL(Number(l.valor))}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Item de nav "Locações"**

Modify `src/lib/nav/itens.tsx` — importar `PackageOpen` e adicionar, após o bloco do item "Itens":
```tsx
  if (flags.usa_locacao) {
    itens.push({ href: "/painel/locacoes", rotulo: "Locações", Icone: PackageOpen });
  }
```

- [ ] **Step 5: Prova viva**

Modify `scripts/verificar-resumo.mjs` — ANTES do cleanup, adicionar:
```js
// Fase 5B: locacao (recebido) cria entrada; reserva sobe; devolucao limpa.
const { data: itAl, error: eItAl } = await cli.from("itens")
  .insert({ negocio_id: negId, nome: "Furadeira", preco: 80, tipo: "aluguel", estoque: 3 }).select("id").single();
assert(!eItAl && itAl?.id, "criou item de aluguel (estoque 3)");
const { data: cliLoc } = await cli.from("clientes").insert({ negocio_id: negId, nome: "Locatario Teste", tipo: "pessoa" }).select("id").single();
const { data: loc, error: eLoc } = await cli.from("locacoes")
  .insert({ negocio_id: negId, item_id: itAl.id, cliente_id: cliLoc.id, quantidade: 1, valor: 80, devolucao_prevista: "2999-01-01" }).select("id").single();
assert(!eLoc && loc?.id, "registrou locacao (qtd 1)");
const { data: abertas } = await cli.from("locacoes").select("quantidade").eq("item_id", itAl.id).is("devolvido_em", null);
const reservado = (abertas ?? []).reduce((a, x) => a + Number(x.quantidade), 0);
assert(reservado === 1, `reserva do item = 1 (veio ${reservado})`);
const hojeIso2 = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
await cli.from("locacoes").update({ devolvido_em: hojeIso2 }).eq("id", loc.id);
const { data: abertas2 } = await cli.from("locacoes").select("id").eq("item_id", itAl.id).is("devolvido_em", null);
assert((abertas2 ?? []).length === 0, "apos devolucao, item sem locacao aberta");
```

- [ ] **Step 6: Build + testes + prova viva**

Run: `npm run build` e `npm test` → verdes. `node scripts/verificar-resumo.mjs` → `RESUMO OK` (o schema da locação já existe no Cloud; não há migration nova).

- [ ] **Step 7: Commit**

```bash
git add src/app/painel/locacoes src/lib/nav/itens.tsx scripts/verificar-resumo.mjs
git commit -m "feat: tela de locacao (registrar, devolucao, reserva derivada, pagamento) + prova viva"
```

---

## Self-Review (cobertura da spec)

- **Cálculos puros (disponível, atrasada) + resolverCliente compartilhado** → Task 1. ✓
- **Itens de aluguel na tela de Itens (seção, disponível derivado, tipo no FormItem)** → Task 2. ✓
- **Clientes abrem para locação (nav + page + acoes) + guarda de locação aberta** → Task 3. ✓
- **Tela de Locação (registrar, pagamento recebido/a receber, aviso, abertas/devolvidas, devolução, excluir)** → Task 4. ✓
- **Reserva derivada (não mexe em estoque)** → Tasks 2 e 4. ✓
- **Sem migration (schema existe)** → confirmado; prova viva usa o índice `idx_locacoes_abertas`. ✓
- **Money-color + server-action safety (wrappers void)** → Task 4. ✓
