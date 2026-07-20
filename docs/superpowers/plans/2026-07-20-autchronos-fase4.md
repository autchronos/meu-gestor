# Fase 4 — Contas a Receber + Reserva — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** Fluxo completo de contas a receber (fiado/cartão/prazo) com marcar-como-pago, clientes, reserva informativa e alerta de saldo mínimo.

**Architecture:** UI + server actions sobre o schema já existente (0005). O trigger `sync_receber_lancamento` já lança a entrada líquida no caixa na transição de `pago`. Uma migration pequena (0009) dá suporte ao busca-ou-cria de cliente. Tudo via RLS + `negocioAtual()`, gating por `usa_fiado`.

**Tech Stack:** Next.js 14 App Router (Server Components + Server Actions), Supabase (Postgres + RLS), Tailwind (tokens institucionais), Vitest.

## Global Constraints

- **Money-color rule:** navy (`text-marca`) NUNCA colore dinheiro. Valor a receber e "guardado" na reserva → neutro (`text-texto`/`text-texto-suave`). Vencidas → `text-saida` (vinho). Barra de reserva → `bg-dourado` sólido. **Nunca** usar modificador de opacidade em token var (`bg-dourado/10`, `border-saida/30` não renderizam); `text-white/70` sobre navy é ok.
- **Isolamento multi-tenant:** toda leitura/escrita escopada ao negócio via `negocioAtual()` (nunca confiar em id vindo do cliente) + RLS. Gating server-side por `usa_fiado` em todas as server actions de a-receber/clientes.
- **Fuso America/Sao_Paulo:** usar `hojeSP()` para "hoje"/vencidas.
- **Moeda:** `formatarBRL` para exibir, `parseValorBRL` para ler entrada. Interface 100% pt-BR.
- **Trigger existente é a fonte da verdade do caixa:** marcar `pago=true` gera a entrada líquida; `pago=false` a apaga. Não inserir/alterar `lancamentos` manualmente para contas a receber. Editar valor/taxa só com a conta **não paga**.
- **Reserva é informativa:** Guardar/Tirar só ajustam `metas.valor_reservado` (clamp ≥ 0). Não toca no caixa.

## File Structure

- `supabase/migrations/0009_clientes_unico.sql` (novo) — UNIQUE case-insensitive de cliente + índice da lista de abertas.
- `src/lib/receber/calculos.ts` (novo) — `liquido`, `estaVencida` (puros).
- `src/lib/relatorio/calculos.ts` (modificar) — `mesesRestantes`, `deveAlertarSaldo` (puros).
- `src/lib/nav/itens.tsx` (modificar) — itens "A receber" e "Clientes" gated `usa_fiado`.
- `src/components/nav/Sidebar.tsx`, `DrawerNav.tsx` (modificar) — passar `usaFiado`.
- `src/app/painel/layout.tsx` (modificar) — passar `negocio.usa_fiado` à nav.
- `src/app/painel/clientes/{page.tsx,acoes.ts,FormCliente.tsx}` (novo) — CRUD de clientes.
- `src/app/painel/a-receber/{page.tsx,acoes.ts,FormReceber.tsx}` (novo) — contas a receber.
- `src/app/painel/relatorios/{page.tsx,acoes.ts}` (modificar) + `FormReserva.tsx` (novo) — reserva.
- `src/app/painel/page.tsx` (modificar) — alerta de saldo mínimo.
- `scripts/verificar-resumo.mjs` (modificar) — prova viva do fluxo receber→pago→líquido.

---

### Task 1: Migration 0009 + cálculos puros de receber

**Files:**
- Create: `supabase/migrations/0009_clientes_unico.sql`
- Create: `src/lib/receber/calculos.ts`
- Test: `tests/receber-calculos.test.ts`

**Interfaces:**
- Produces: `liquido(valor: number, taxa: number): number`; `estaVencida(vencimento: string | null, hoje: string): boolean`. Migration cria `idx_clientes_negocio_nome` (UNIQUE, `lower(nome)`) e `idx_receber_negocio_pago_venc`.

- [ ] **Step 1: Migration**

Create `supabase/migrations/0009_clientes_unico.sql`:
```sql
-- ============================================================
-- Fase 4: suporte a contas a receber + clientes sem duplicar.
-- ============================================================
-- Cliente unico por negocio (case-insensitive) -> "busca-ou-cria" limpo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_negocio_nome
  ON clientes (negocio_id, lower(nome));

-- Lista de contas abertas ordenada por vencimento.
CREATE INDEX IF NOT EXISTS idx_receber_negocio_pago_venc
  ON receber (negocio_id, pago, vencimento);
```
(Os índices base `idx_clientes_negocio` e `idx_receber_negocio` já existem no 0001.)

- [ ] **Step 2: Teste dos cálculos (falha primeiro)**

Create `tests/receber-calculos.test.ts`:
```ts
import { liquido, estaVencida } from "@/lib/receber/calculos";

test("liquido desconta a taxa e arredonda em 2 casas (igual ao trigger)", () => {
  expect(liquido(200, 10)).toBe(180);
  expect(liquido(100, 0)).toBe(100);
  expect(liquido(99.99, 3.5)).toBe(96.49); // 99.99 * 0.965 = 96.49035 -> 96.49
  expect(liquido(50, 100)).toBe(0);
});

test("estaVencida: passado vence; hoje/futuro/sem-vencimento nao", () => {
  expect(estaVencida("2026-07-19", "2026-07-20")).toBe(true);
  expect(estaVencida("2026-07-20", "2026-07-20")).toBe(false);
  expect(estaVencida("2026-07-21", "2026-07-20")).toBe(false);
  expect(estaVencida(null, "2026-07-20")).toBe(false);
});
```

- [ ] **Step 3: Rodar (deve falhar)**

Run: `npm test -- receber-calculos`
Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar**

Create `src/lib/receber/calculos.ts`:
```ts
// Valor liquido que cai no caixa quando a conta e paga. MESMA conta do trigger
// sync_receber_lancamento (0005): ROUND(valor * (1 - taxa/100), 2).
export function liquido(valor: number, taxa: number): number {
  return Math.round(valor * (1 - taxa / 100) * 100) / 100;
}

// Vencida = tem vencimento no passado. Sem vencimento nunca vence.
// (Aqui e so a comparacao de datas; "aberta" e filtrado na tela.)
export function estaVencida(vencimento: string | null, hoje: string): boolean {
  return !!vencimento && vencimento < hoje;
}
```

- [ ] **Step 5: Rodar (deve passar)**

Run: `npm test -- receber-calculos`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0009_clientes_unico.sql src/lib/receber/calculos.ts tests/receber-calculos.test.ts
git commit -m "feat: migration 0009 (cliente unico) e calculos de receber (liquido, vencida)"
```

**Dependência externa:** o usuário aplica a 0009 no Supabase SQL Editor antes da verificação viva (Task 3).

---

### Task 2: Clientes (CRUD) + navegação

**Files:**
- Create: `src/app/painel/clientes/acoes.ts`, `src/app/painel/clientes/FormCliente.tsx`, `src/app/painel/clientes/page.tsx`
- Modify: `src/lib/nav/itens.tsx`, `src/components/nav/Sidebar.tsx`, `src/components/nav/DrawerNav.tsx`, `src/app/painel/layout.tsx`

**Interfaces:**
- Consumes: `negocioAtual()` (tem `usa_fiado`), `criarClienteServidor`.
- Produces: server actions `salvarCliente`, `excluirCliente`; item de nav "Clientes" gated `usa_fiado`; `itensNav` passa a exigir `{ usa_carteiras, usa_fiado }`.

- [ ] **Step 1: Server actions**

Create `src/app/painel/clientes/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export type TipoCliente = "pessoa" | "empresa";

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_fiado) return { negocio: null, erro: "Clientes estão desativados nas configurações." as string };
  return { negocio, erro: "" };
}

export async function salvarCliente(d: { id?: string; nome: string; telefone: string; tipo: TipoCliente }) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "Informe o nome do cliente." };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const payload = { negocio_id: g.negocio.id, nome, telefone: d.telefone.trim() || null, tipo: d.tipo };
  const resp = d.id
    ? await supabase.from("clientes").update(payload).eq("id", d.id)
    : await supabase.from("clientes").insert(payload);
  if (resp.error) {
    return { erro: resp.error.code === "23505" ? "Já existe um cliente com esse nome." : "Não foi possível salvar o cliente." };
  }
  revalidatePath("/painel/clientes");
  return { ok: true };
}

export async function excluirCliente(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { count } = await supabase
    .from("receber").select("id", { count: "exact", head: true }).eq("cliente_id", id);
  if ((count ?? 0) > 0) return { erro: "Esse cliente tem contas a receber. Quite ou exclua as contas antes." };
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir o cliente." };
  revalidatePath("/painel/clientes");
  return { ok: true };
}
```

- [ ] **Step 2: Form (client)**

Create `src/app/painel/clientes/FormCliente.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarCliente, type TipoCliente } from "@/app/painel/clientes/acoes";

interface Inicial { id: string; nome: string; telefone: string | null; tipo: TipoCliente }

export function FormCliente({ inicial }: { inicial?: Inicial }) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "");
  const [tipo, setTipo] = useState<TipoCliente>(inicial?.tipo ?? "pessoa");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarCliente({ id: inicial?.id, nome, telefone, tipo });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Cliente salvo!");
      if (!inicial) { setNome(""); setTelefone(""); setTipo("pessoa"); }
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">{inicial ? "Editar cliente" : "Novo cliente"}</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className={campo} />
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone (opcional)" inputMode="tel" className={campo} />
      <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCliente)} className={campo}>
        <option value="pessoa">Pessoa</option>
        <option value="empresa">Empresa</option>
      </select>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página**

Create `src/app/painel/clientes/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { FormCliente } from "@/app/painel/clientes/FormCliente";
import { excluirCliente } from "@/app/painel/clientes/acoes";

export default async function Clientes() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_fiado) redirect("/painel");
  const supabase = criarClienteServidor();

  const [{ data: clientes }, { data: abertas }] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone, tipo").eq("negocio_id", negocio.id).order("nome"),
    supabase.from("receber").select("cliente_id, valor").eq("negocio_id", negocio.id).eq("pago", false),
  ]);

  const devePor = new Map<string, number>();
  for (const r of abertas ?? []) devePor.set(r.cliente_id, (devePor.get(r.cliente_id) ?? 0) + Number(r.valor));

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Clientes</h1>
      <FormCliente />
      <ul className="border border-borda bg-superficie">
        {(clientes ?? []).map((c, idx, arr) => (
          <li key={c.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="text-marca">{c.nome}</p>
                {c.telefone && <p className="text-xs text-texto-suave">{c.telefone}</p>}
              </div>
              <div className="flex items-center gap-3">
                {devePor.get(c.id) ? (
                  <span className="tabular-nums text-texto-suave">deve {formatarBRL(devePor.get(c.id)!)}</span>
                ) : null}
                <form action={excluirCliente.bind(null, c.id)}>
                  <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                </form>
              </div>
            </div>
            <details className="border-t border-borda">
              <summary className="cursor-pointer px-5 py-2 text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
              <div className="p-4"><FormCliente inicial={{ id: c.id, nome: c.nome, telefone: c.telefone, tipo: c.tipo }} /></div>
            </details>
          </li>
        ))}
        {(clientes ?? []).length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhum cliente ainda.</li>}
      </ul>
    </section>
  );
}
```
Nota: `excluirCliente` devolve `{erro}` em vez de lançar; o `<form action>` ignora o retorno (o botão some se a exclusão passa). Feedback de erro de exclusão fica como Minor deferido (mesmo padrão de categorias/lançamentos).

- [ ] **Step 4: Navegação — itens + threading de `usa_fiado`**

Modify `src/lib/nav/itens.tsx` — importar ícones novos, estender `Flags`, adicionar bloco `usa_fiado`:
```tsx
import {
  LayoutGrid, ScrollText, ArrowUpFromLine, Tags, BarChart3, Settings,
  HandCoins, Users,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
}

interface Flags {
  usa_carteiras: boolean;
  usa_fiado: boolean;
}

export function itensNav(flags: Flags): ItemNav[] {
  const itens: ItemNav[] = [
    { href: "/painel", rotulo: "Início", Icone: LayoutGrid },
    { href: "/painel/lancamentos", rotulo: "Lançamentos", Icone: ScrollText },
  ];
  if (flags.usa_fiado) {
    itens.push({ href: "/painel/clientes", rotulo: "Clientes", Icone: Users });
  }
  if (flags.usa_carteiras) {
    itens.push({ href: "/painel/retiradas", rotulo: "Retiradas", Icone: ArrowUpFromLine });
  }
  itens.push({ href: "/painel/categorias", rotulo: "Categorias", Icone: Tags });
  itens.push({ href: "/painel/relatorios", rotulo: "Relatórios", Icone: BarChart3 });
  itens.push({ href: "/painel/configuracoes", rotulo: "Config", Icone: Settings });
  return itens;
}

export function ehAtivo(pathname: string, href: string): boolean {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(`${href}/`);
}
```
(`HandCoins` já entra no import agora; será usado na Task 3.)

Modify `src/components/nav/Sidebar.tsx` — a assinatura recebe `usaFiado` e repassa. Trocar a linha `const itens = itensNav({ usa_carteiras: usaCarteiras });` por `const itens = itensNav({ usa_carteiras: usaCarteiras, usa_fiado: usaFiado });` e adicionar `usaFiado: boolean` às props (junto de `usaCarteiras`).

Modify `src/components/nav/DrawerNav.tsx` — idem: adicionar prop `usaFiado: boolean` e `const itens = itensNav({ usa_carteiras: usaCarteiras, usa_fiado: usaFiado });`.

Modify `src/app/painel/layout.tsx` — passar a flag:
```tsx
<Sidebar usaCarteiras={negocio.usa_carteiras} usaFiado={negocio.usa_fiado} nome={negocio.nome} />
<DrawerNav usaCarteiras={negocio.usa_carteiras} usaFiado={negocio.usa_fiado} nome={negocio.nome} />
```

- [ ] **Step 5: Build + testes**

Run: `npm run build` (se `.next` der erro no OneDrive: `rm -rf .next` e repetir) e `npm test` → verdes.

- [ ] **Step 6: Commit**

```bash
git add src/app/painel/clientes src/lib/nav/itens.tsx src/components/nav/Sidebar.tsx src/components/nav/DrawerNav.tsx src/app/painel/layout.tsx
git commit -m "feat: CRUD de clientes + itens de nav gated por usa_fiado"
```

---

### Task 3: Contas a receber (formulário, lista, ciclo pago) + prova viva

**Files:**
- Create: `src/app/painel/a-receber/acoes.ts`, `src/app/painel/a-receber/FormReceber.tsx`, `src/app/painel/a-receber/page.tsx`
- Modify: `src/lib/nav/itens.tsx` (adicionar item "A receber"), `scripts/verificar-resumo.mjs`

**Interfaces:**
- Consumes: `liquido`/`estaVencida` (Task 1), `negocioAtual`, `formatarBRL`/`parseValorBRL`, `hojeSP`.
- Produces: server actions `criarReceber`, `editarReceber`, `marcarPago`, `desmarcarPago`, `excluirReceber`.

- [ ] **Step 1: Server actions**

Create `src/app/painel/a-receber/acoes.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";

export interface DadosReceber {
  id?: string;
  cliente: string;      // nome (busca-ou-cria) — usado so na criacao
  descricao: string;
  valor: number;
  vencimento: string;   // "" = sem vencimento
  forma: string;        // "" = nao informado
  taxa: number;         // 0..100
}

async function guarda() {
  const negocio = await negocioAtual();
  if (!negocio) return { negocio: null, erro: "Negócio não encontrado." as string };
  if (!negocio.usa_fiado) return { negocio: null, erro: "Contas a receber estão desativadas nas configurações." as string };
  return { negocio, erro: "" };
}

function valida(d: DadosReceber): string | null {
  if (d.valor <= 0) return "Informe um valor maior que zero.";
  if (!d.descricao.trim()) return "Informe uma descrição.";
  if (d.taxa < 0 || d.taxa > 100) return "A taxa deve ficar entre 0 e 100%.";
  return null;
}

// Busca (case-insensitive) ou cria o cliente; devolve o id.
async function resolverCliente(
  supabase: ReturnType<typeof criarClienteServidor>, negocioId: string, nome: string,
): Promise<string | null> {
  const { data: existente } = await supabase
    .from("clientes").select("id").eq("negocio_id", negocioId).ilike("nome", nome).maybeSingle();
  if (existente?.id) return existente.id;
  const { data: novo, error } = await supabase
    .from("clientes").insert({ negocio_id: negocioId, nome, tipo: "pessoa" }).select("id").single();
  if (novo?.id) return novo.id;
  // Corrida de duplo-clique: a UNIQUE (0009) barra o 2o insert -> re-busca.
  if (error?.code === "23505") {
    const { data: r } = await supabase
      .from("clientes").select("id").eq("negocio_id", negocioId).ilike("nome", nome).maybeSingle();
    return r?.id ?? null;
  }
  return null;
}

export async function criarReceber(d: DadosReceber) {
  const nomeCliente = d.cliente.trim();
  if (!nomeCliente) return { erro: "Informe o cliente." };
  const erro = valida(d);
  if (erro) return { erro };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const clienteId = await resolverCliente(supabase, g.negocio.id, nomeCliente);
  if (!clienteId) return { erro: "Não foi possível salvar o cliente." };
  const { error } = await supabase.from("receber").insert({
    negocio_id: g.negocio.id,
    cliente_id: clienteId,
    descricao: d.descricao.trim(),
    valor: d.valor,
    vencimento: d.vencimento || null,
    forma_pagamento: d.forma || null,
    taxa: d.taxa,
  });
  if (error) return { erro: "Não foi possível salvar a conta." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}

export async function editarReceber(d: DadosReceber) {
  if (!d.id) return { erro: "Conta inválida." };
  const erro = valida(d);
  if (erro) return { erro };
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { data: atual } = await supabase.from("receber").select("pago").eq("id", d.id).maybeSingle();
  if (!atual) return { erro: "Conta não encontrada." };
  if (atual.pago) return { erro: "Não dá para editar uma conta já paga. Desmarque o pagamento primeiro." };
  const { error } = await supabase.from("receber").update({
    descricao: d.descricao.trim(),
    valor: d.valor,
    vencimento: d.vencimento || null,
    forma_pagamento: d.forma || null,
    taxa: d.taxa,
  }).eq("id", d.id);
  if (error) return { erro: "Não foi possível salvar as alterações." };
  revalidatePath("/painel/a-receber");
  return { ok: true };
}

async function setPago(id: string, pago: boolean) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("receber").update({ pago }).eq("id", id);
  if (error) return { erro: "Não foi possível atualizar a conta." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}

export const marcarPago = (id: string) => setPago(id, true);
export const desmarcarPago = (id: string) => setPago(id, false);

export async function excluirReceber(id: string) {
  const g = await guarda();
  if (!g.negocio) return { erro: g.erro };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("receber").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir a conta." };
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel");
  return { ok: true };
}
```

- [ ] **Step 2: Form (client)**

Create `src/app/painel/a-receber/FormReceber.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { criarReceber, editarReceber, type DadosReceber } from "@/app/painel/a-receber/acoes";
import { parseValorBRL } from "@/lib/formato";

const FORMAS = ["Fiado", "Cartão de crédito", "Cartão de débito", "PIX", "Boleto", "Cheque"];

// Edicao nao mexe no cliente (so na criacao), por isso Inicial nao carrega cliente.
interface Inicial { id: string; descricao: string; valor: string; vencimento: string; forma: string; taxa: string }

export function FormReceber({ nomesClientes, inicial }: { nomesClientes: string[]; inicial?: Inicial }) {
  const ed = Boolean(inicial?.id);
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial?.valor ?? "");
  const [vencimento, setVencimento] = useState(inicial?.vencimento ?? "");
  const [forma, setForma] = useState(inicial?.forma ?? "");
  const [taxa, setTaxa] = useState(inicial?.taxa ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const d: DadosReceber = {
        id: inicial?.id, cliente, descricao,
        valor: parseValorBRL(valor), vencimento,
        forma, taxa: Number(taxa.replace(",", ".")) || 0,
      };
      const r = ed ? await editarReceber(d) : await criarReceber(d);
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Conta salva!");
      if (!ed) { setCliente(""); setDescricao(""); setValor(""); setVencimento(""); setForma(""); setTaxa(""); }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!ed && (
        <>
          <input list="lista-clientes" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" className={campo} />
          <datalist id="lista-clientes">{nomesClientes.map((n) => <option key={n} value={n} />)}</datalist>
        </>
      )}
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: 2 marmitas)" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor 0,00" className={campo} />
        <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={forma} onChange={(e) => setForma(e.target.value)} className={campo}>
          <option value="">Forma de pagamento</option>
          {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input value={taxa} onChange={(e) => setTaxa(e.target.value)} inputMode="decimal" placeholder="Taxa %" className={campo} />
      </div>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : ed ? "Salvar alterações" : "Adicionar conta"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página**

Create `src/app/painel/a-receber/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { hojeSP } from "@/lib/caixa/periodo";
import { liquido, estaVencida } from "@/lib/receber/calculos";
import { FormReceber } from "@/app/painel/a-receber/FormReceber";
import { marcarPago, desmarcarPago, excluirReceber } from "@/app/painel/a-receber/acoes";

type Linha = {
  id: string; descricao: string; valor: number; vencimento: string | null;
  forma_pagamento: string | null; taxa: number; clientes: { nome: string } | null;
};

export default async function AReceber({ searchParams }: { searchParams: { novo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_fiado) redirect("/painel");
  const supabase = criarClienteServidor();
  const hoje = hojeSP();
  const sel = "id, descricao, valor, vencimento, forma_pagamento, taxa, clientes(nome)";

  const [{ data: abertasRaw }, { data: pagasRaw }, { data: clientes }] = await Promise.all([
    supabase.from("receber").select(sel).eq("negocio_id", negocio.id).eq("pago", false)
      .order("vencimento", { ascending: true, nullsFirst: false }),
    supabase.from("receber").select(sel).eq("negocio_id", negocio.id).eq("pago", true)
      .order("data", { ascending: false }).limit(100),
    supabase.from("clientes").select("nome").eq("negocio_id", negocio.id).order("nome"),
  ]);

  const abertas = (abertasRaw ?? []) as unknown as Linha[];
  const pagas = (pagasRaw ?? []) as unknown as Linha[];
  const totalAberto = abertas.reduce((a, r) => a + Number(r.valor), 0);
  const nomes = (clientes ?? []).map((c) => c.nome);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">A receber</h1>

      <details open={searchParams?.novo === "1"} className="border border-borda bg-superficie">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Nova conta a receber</summary>
        <div className="border-t border-borda p-4"><FormReceber nomesClientes={nomes} /></div>
      </details>

      <div className="border border-borda bg-superficie p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">Total a receber</p>
        <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-texto">{formatarBRL(totalAberto)}</p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Abertas</h2>
      <ul className="border border-borda bg-superficie">
        {abertas.map((r, idx, arr) => {
          const vencida = estaVencida(r.vencimento, hoje);
          return (
            <li key={r.id} className={idx !== arr.length - 1 ? "border-b border-borda" : ""}>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-marca">{r.clientes?.nome ?? "—"} · {r.descricao}</p>
                  <p className="text-xs text-texto-suave">
                    {r.vencimento ? <span className={vencida ? "text-saida" : ""}>vence {r.vencimento}{vencida ? " (vencida)" : ""}</span> : "sem vencimento"}
                    {r.forma_pagamento ? ` · ${r.forma_pagamento}` : ""}
                    {r.taxa > 0 ? ` · taxa ${r.taxa}% → líquido ${formatarBRL(liquido(Number(r.valor), Number(r.taxa)))}` : ""}
                  </p>
                </div>
                <span className="tabular-nums text-texto">{formatarBRL(Number(r.valor))}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-borda px-5 py-2">
                <form action={marcarPago.bind(null, r.id)}>
                  <button type="submit" className="text-xs font-semibold uppercase tracking-wider text-entrada hover:opacity-80">Marcar pago</button>
                </form>
                <form action={excluirReceber.bind(null, r.id)}>
                  <button type="submit" className="text-xs text-texto-suave hover:text-saida">Excluir</button>
                </form>
                <details className="w-full">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-texto-suave">Editar</summary>
                  <div className="pt-3">
                    <FormReceber nomesClientes={nomes} inicial={{
                      id: r.id, descricao: r.descricao, valor: String(Number(r.valor)).replace(".", ","),
                      vencimento: r.vencimento ?? "", forma: r.forma_pagamento ?? "", taxa: String(Number(r.taxa)).replace(".", ","),
                    }} />
                  </div>
                </details>
              </div>
            </li>
          );
        })}
        {abertas.length === 0 && <li className="px-5 py-3 text-sm text-texto-suave">Nenhuma conta aberta.</li>}
      </ul>

      {pagas.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-texto-suave">Pagas</h2>
          <ul className="border border-borda bg-superficie">
            {pagas.map((r, idx, arr) => (
              <li key={r.id} className={`flex items-center justify-between px-5 py-3 text-sm ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
                <div>
                  <p className="text-marca">{r.clientes?.nome ?? "—"} · {r.descricao}</p>
                  <p className="text-xs text-texto-suave">recebido{r.taxa > 0 ? ` · líquido ${formatarBRL(liquido(Number(r.valor), Number(r.taxa)))}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-texto-suave">{formatarBRL(Number(r.valor))}</span>
                  <form action={desmarcarPago.bind(null, r.id)}>
                    <button type="submit" className="text-xs text-texto-suave hover:text-marca">Desmarcar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Item de nav "A receber"**

Modify `src/lib/nav/itens.tsx` — dentro do bloco `if (flags.usa_fiado)`, ANTES do item Clientes:
```tsx
  if (flags.usa_fiado) {
    itens.push({ href: "/painel/a-receber", rotulo: "A receber", Icone: HandCoins });
    itens.push({ href: "/painel/clientes", rotulo: "Clientes", Icone: Users });
  }
```

- [ ] **Step 5: Prova viva (estende verificar-resumo.mjs)**

Modify `scripts/verificar-resumo.mjs` — ANTES do bloco de cleanup (`await admin.from("negocios").delete...`), adicionar:
```js
// Fase 4: conta a receber -> marcar pago -> entrada LIQUIDA no caixa.
const { data: cli4, error: eCli4 } = await cli.from("clientes")
  .insert({ negocio_id: negId, nome: "Fulano Teste", tipo: "pessoa" }).select("id").single();
assert(!eCli4 && cli4?.id, "criou cliente de teste");
const { data: rec, error: eRec } = await cli.from("receber")
  .insert({ negocio_id: negId, cliente_id: cli4.id, descricao: "venda a prazo", valor: 200, taxa: 10 })
  .select("id").single();
assert(!eRec && rec?.id, "criou conta a receber (200, taxa 10)");
await cli.from("receber").update({ pago: true }).eq("id", rec.id);
const { data: lanc4 } = await cli.from("lancamentos").select("valor, tipo").eq("receber_id", rec.id).maybeSingle();
assert(lanc4 && Number(lanc4.valor) === 180 && lanc4.tipo === "entrada", `pago gera entrada liquida 180 (veio ${lanc4?.valor})`);
await cli.from("receber").update({ pago: false }).eq("id", rec.id);
const { count: nLanc } = await cli.from("lancamentos").select("id", { count: "exact", head: true }).eq("receber_id", rec.id);
assert((nLanc ?? 0) === 0, "desmarcar pago apaga o lancamento");
```

- [ ] **Step 6: Build + testes + prova viva**

Run: `npm run build` e `npm test` → verdes. Depois que o usuário aplicar a 0009: `node scripts/verificar-resumo.mjs` → deve terminar em `RESUMO OK` com as novas asserções.

- [ ] **Step 7: Commit**

```bash
git add src/app/painel/a-receber src/lib/nav/itens.tsx scripts/verificar-resumo.mjs
git commit -m "feat: contas a receber (form, lista, ciclo pago via trigger) + prova viva"
```

---

### Task 4: Reserva & alerta de saldo mínimo

**Files:**
- Modify: `src/lib/relatorio/calculos.ts`, `tests/calculos.test.ts`
- Create: `src/app/painel/relatorios/FormReserva.tsx`
- Modify: `src/app/painel/relatorios/acoes.ts`, `src/app/painel/relatorios/page.tsx`, `src/app/painel/page.tsx`

**Interfaces:**
- Consumes: `progressoMeta` (já existe), `metas` (colunas reserva_* e saldo_minimo), `resumo_dashboard.disponivel`.
- Produces: `mesesRestantes`, `deveAlertarSaldo` (puros); server actions `salvarReserva`, `ajustarReserva`.

- [ ] **Step 1: Testes dos cálculos (falha primeiro)**

Modify `tests/calculos.test.ts` — adicionar no fim:
```ts
import { mesesRestantes, deveAlertarSaldo } from "@/lib/relatorio/calculos";

test("mesesRestantes: futuro, ajuste por dia, passado e nulo", () => {
  expect(mesesRestantes("2026-12-01", "2026-07-20")).toBe(4); // 5 meses, mas dia 1 < 20 -> 4
  expect(mesesRestantes("2026-12-30", "2026-07-20")).toBe(5);
  expect(mesesRestantes("2026-01-01", "2026-07-20")).toBe(0); // passado -> 0
  expect(mesesRestantes(null, "2026-07-20")).toBeNull();
});

test("deveAlertarSaldo: so quando ha minimo definido e o caixa cai abaixo", () => {
  expect(deveAlertarSaldo(300, 500)).toBe(true);
  expect(deveAlertarSaldo(500, 500)).toBe(false);
  expect(deveAlertarSaldo(300, 0)).toBe(false);
});
```

- [ ] **Step 2: Rodar (deve falhar)**

Run: `npm test -- calculos`
Expected: FAIL (funções não existem).

- [ ] **Step 3: Implementar os cálculos**

Modify `src/lib/relatorio/calculos.ts` — adicionar no fim:
```ts
// Meses cheios de hoje ate o prazo (>= 0). Sem prazo => null.
export function mesesRestantes(prazo: string | null, hoje: string): number | null {
  if (!prazo) return null;
  const [hy, hm, hd] = hoje.split("-").map(Number);
  const [py, pm, pd] = prazo.split("-").map(Number);
  let meses = (py - hy) * 12 + (pm - hm);
  if (pd < hd) meses -= 1;
  return Math.max(0, meses);
}

// Alerta so quando existe um minimo definido e o disponivel caiu abaixo dele.
export function deveAlertarSaldo(disponivel: number, saldoMinimo: number): boolean {
  return saldoMinimo > 0 && disponivel < saldoMinimo;
}
```

- [ ] **Step 4: Rodar (deve passar)**

Run: `npm test -- calculos`
Expected: PASS.

- [ ] **Step 5: Server actions de reserva**

Modify `src/app/painel/relatorios/acoes.ts` — adicionar (mantém o `salvarMetas` existente):
```ts
export async function salvarReserva(alvo: number, prazo: string, saldoMinimo: number) {
  if (alvo < 0 || saldoMinimo < 0) return { erro: "Os valores não podem ser negativos." };
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("metas")
    .update({ reserva_alvo: alvo, reserva_prazo: prazo || null, saldo_minimo: saldoMinimo })
    .eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível salvar a reserva." };
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel");
  return { ok: true };
}

export async function ajustarReserva(delta: number) {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const { data: m } = await supabase.from("metas").select("valor_reservado").eq("negocio_id", negocio.id).maybeSingle();
  const novo = Math.max(0, Number(m?.valor_reservado ?? 0) + delta);
  const { error } = await supabase.from("metas").update({ valor_reservado: novo }).eq("negocio_id", negocio.id);
  if (error) return { erro: "Não foi possível atualizar a reserva." };
  revalidatePath("/painel/relatorios");
  return { ok: true };
}
```

- [ ] **Step 6: Form de reserva (client)**

Create `src/app/painel/relatorios/FormReserva.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { salvarReserva, ajustarReserva } from "@/app/painel/relatorios/acoes";
import { parseValorBRL } from "@/lib/formato";

interface Props { alvoAtual: number; prazoAtual: string; saldoMinimoAtual: number }

export function FormReserva({ alvoAtual, prazoAtual, saldoMinimoAtual }: Props) {
  const brl = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");
  const [alvo, setAlvo] = useState(brl(alvoAtual));
  const [prazo, setPrazo] = useState(prazoAtual);
  const [minimo, setMinimo] = useState(brl(saldoMinimoAtual));
  const [mov, setMov] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function definir() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarReserva(parseValorBRL(alvo), prazo, parseValorBRL(minimo));
      setMsg(r?.erro ?? "Reserva salva!");
    });
  }
  function mexer(sinal: 1 | -1) {
    const v = parseValorBRL(mov);
    if (v <= 0) { setMsg("Informe um valor para guardar ou tirar."); return; }
    setMsg(null);
    iniciar(async () => {
      const r = await ajustarReserva(sinal * v);
      if (!r?.erro) setMov("");
      setMsg(r?.erro ?? (sinal === 1 ? "Guardado!" : "Retirado da reserva."));
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Definir reserva</p>
      <label className="flex flex-col gap-1 text-sm">Alvo da reserva
        <input value={alvo} onChange={(e) => setAlvo(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Prazo (opcional)
        <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">Saldo mínimo do caixa (alerta)
        <input value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
      </label>
      <button type="button" onClick={definir} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar reserva"}
      </button>
      <div className="mt-2 flex items-end gap-2 border-t border-borda pt-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">Guardar / tirar
          <input value={mov} onChange={(e) => setMov(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
        </label>
        <button type="button" onClick={() => mexer(1)} disabled={pendente}
          className="border border-entrada px-3 py-2 text-sm font-semibold uppercase tracking-wider text-entrada transition-colors hover:bg-entrada hover:text-white disabled:opacity-60">Guardar</button>
        <button type="button" onClick={() => mexer(-1)} disabled={pendente}
          className="border border-borda px-3 py-2 text-sm font-semibold uppercase tracking-wider text-texto-suave transition-colors hover:text-saida disabled:opacity-60">Tirar</button>
      </div>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 7: Seção de reserva no Relatório**

Modify `src/app/painel/relatorios/page.tsx`:
1. Nos imports, acrescentar `mesesRestantes` à lista de `@/lib/relatorio/calculos` e importar `FormReserva`:
```tsx
import { intervaloRelatorio, mesAnterior, margemPct, variacaoPct, progressoMeta, mesesRestantes, type Intervalo } from "@/lib/relatorio/calculos";
import { FormReserva } from "@/app/painel/relatorios/FormReserva";
```
2. Estender o `select` de metas para trazer os campos de reserva:
```tsx
    supabase.from("metas").select("meta_faturamento, meta_lucro, reserva_alvo, reserva_prazo, valor_reservado, saldo_minimo").eq("negocio_id", negocio.id).maybeSingle(),
```
3. Após `const metaLuc = ...`, derivar os valores da reserva:
```tsx
  const reservaAlvo = Number(metasR.data?.reserva_alvo ?? 0);
  const reservaPrazo = (metasR.data?.reserva_prazo as string | null) ?? "";
  const reservado = Number(metasR.data?.valor_reservado ?? 0);
  const saldoMinimo = Number(metasR.data?.saldo_minimo ?? 0);
  const pctReserva = progressoMeta(reservado, reservaAlvo);
  const mesesReserva = mesesRestantes(reservaPrazo || null, hoje);
```
4. Antes do `<FormMetas .../>`, inserir o bloco visual + o form:
```tsx
        <div className="border border-borda bg-superficie p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-marca">Reserva de emergência</p>
          <div className="mt-3 flex items-baseline justify-between text-sm">
            <span className="text-texto">Guardado</span>
            <span className="tabular-nums text-texto-suave">{formatarBRL(reservado)} / {formatarBRL(reservaAlvo)} <span className="text-marca">({pctReserva}%)</span></span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden bg-borda"><div className="h-full bg-dourado" style={{ width: `${pctReserva}%` }} /></div>
          {reservaPrazo && mesesReserva !== null && (
            <p className="mt-1 text-xs text-texto-suave">prazo {reservaPrazo} · faltam {mesesReserva} {mesesReserva === 1 ? "mês" : "meses"}</p>
          )}
        </div>
        <FormReserva alvoAtual={reservaAlvo} prazoAtual={reservaPrazo} saldoMinimoAtual={saldoMinimo} />
```

- [ ] **Step 8: Alerta de saldo mínimo no painel**

Modify `src/app/painel/page.tsx`:
1. Imports (o arquivo hoje NÃO importa `formatarBRL` — adicionar os dois):
```tsx
import { formatarBRL } from "@/lib/formato";
import { deveAlertarSaldo } from "@/lib/relatorio/calculos";
```
2. Após pegar `resumo`, buscar o mínimo:
```tsx
  const { data: metaMin } = await supabase.from("metas").select("saldo_minimo").eq("negocio_id", negocio.id).maybeSingle();
  const alertaSaldo = deveAlertarSaldo(Number(r.disponivel), Number(metaMin?.saldo_minimo ?? 0));
```
3. Logo após `<HeroSaldo .../>` e ANTES do `<div className="mx-auto flex max-w-3xl ...">` — ou como primeiro filho desse div — inserir:
```tsx
        {alertaSaldo && (
          <p role="alert" className="border border-saida bg-superficie px-4 py-3 text-sm text-saida">
            Seu caixa está abaixo do saldo mínimo que você definiu ({formatarBRL(Number(metaMin?.saldo_minimo ?? 0))}).
          </p>
        )}
```
(Colocar como primeiro filho do `div.mx-auto...`; garantir que `formatarBRL` esteja importado — se não estiver, adicionar `import { formatarBRL } from "@/lib/formato";`.)

- [ ] **Step 9: Build + testes**

Run: `npm test` e `npm run build` → verdes.

- [ ] **Step 10: Commit**

```bash
git add src/lib/relatorio/calculos.ts tests/calculos.test.ts src/app/painel/relatorios src/app/painel/page.tsx
git commit -m "feat: reserva de emergencia (informativa) + alerta de saldo minimo"
```

---

## Self-Review (cobertura da spec)

- **Migration 0009 (cliente único + índice)** → Task 1. ✓
- **Cálculos puros (líquido, vencida, meses restantes, alerta)** → Tasks 1 e 4. ✓
- **Clientes CRUD + "quanto deve"** → Task 2. ✓
- **A receber: form busca-ou-cria, forma+taxa, lista abertas/pagas, vencidas, marcar/desmarcar pago, editar só se aberta, excluir** → Task 3. ✓
- **Prova viva do trigger (líquido 180)** → Task 3. ✓
- **Reserva informativa (alvo/prazo/guardar/tirar/progresso) + saldo mínimo** → Task 4. ✓
- **Alerta de saldo mínimo no painel** → Task 4. ✓
- **Nav gated por usa_fiado** → Tasks 2 e 3. ✓
- **Money-color rule** → seções neutras para valores a receber/guardado; vencidas em vinho; barra dourada sólida. ✓
