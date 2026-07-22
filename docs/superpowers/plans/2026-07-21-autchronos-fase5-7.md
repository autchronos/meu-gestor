# Fase 5.7 — Polimento (estados vazios + delete com feedback) — Plano

> **Para workers agênticos:** SUB-SKILL: subagent-driven-development ou executing-plans. Passos com checkbox.

**Goal:** `EstadoVazio` + `BotaoExcluir` compartilhados; listas vazias orientam; exclusão confirma e reporta erro. Sem migration.

## Global Constraints

- Tokens institucionais; título `text-marca`, apoio `text-texto-suave`, alerta/erro `text-saida`. Nunca opacidade em token var.
- Server action passada como prop a client component (Next 14 ok). `BotaoExcluir` chama a action **que retorna objeto**, não os wrappers.
- Não mudar lógica de dados/RLS/dinheiro.

## File Structure

- Create: `src/components/EstadoVazio.tsx`, `src/components/BotaoExcluir.tsx`.
- Modify actions: `categorias/acoes.ts`, `lancamentos/acoes.ts` (retornar `{erro?}`); remover wrappers de exclusão em `clientes/acoes.ts`, `itens/acoes.ts`, `a-receber/acoes.ts`, `locacoes/acoes.ts`.
- Modify pages (EstadoVazio + BotaoExcluir): `itens/page.tsx`, `clientes/page.tsx`, `a-receber/page.tsx`, `locacoes/page.tsx`, `lancamentos/page.tsx`, `categorias/page.tsx`.

---

### Task 1: Componentes compartilhados

- [ ] **Step 1: `EstadoVazio`**

Create `src/components/EstadoVazio.tsx`:
```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EstadoVazio({ Icone, titulo, descricao, cta }: {
  Icone: LucideIcon; titulo: string; descricao: string; cta?: { href: string; rotulo: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 border border-borda bg-superficie px-5 py-10 text-center">
      <Icone className="h-8 w-8 text-texto-suave" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-marca">{titulo}</p>
      <p className="max-w-xs text-xs text-texto-suave">{descricao}</p>
      {cta && (
        <Link href={cta.href} className="mt-1 border border-marca px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
          {cta.rotulo}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `BotaoExcluir`**

Create `src/components/BotaoExcluir.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState, useTransition } from "react";

export function BotaoExcluir({ acao, id, label = "Excluir" }: {
  acao: (id: string) => Promise<unknown>; id: string; label?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function clique() {
    setErro(null);
    if (!confirmando) {
      setConfirmando(true);
      timer.current = setTimeout(() => setConfirmando(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setConfirmando(false);
    iniciar(async () => {
      const r = (await acao(id)) as { erro?: string } | undefined;
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={clique} disabled={pendente}
        className={`text-xs disabled:opacity-60 ${confirmando ? "font-semibold text-saida" : "text-texto-suave hover:text-saida"}`}>
        {pendente ? "..." : confirmando ? "Confirmar?" : label}
      </button>
      {erro && <span className="text-[11px] text-saida">{erro}</span>}
    </span>
  );
}
```

- [ ] **Step 3: Build** (`npm run build`) — os componentes ainda não são usados; só compila.

- [ ] **Step 4: Commit**
```bash
git add src/components/EstadoVazio.tsx src/components/BotaoExcluir.tsx
git commit -m "feat: componentes EstadoVazio e BotaoExcluir (confirma + reporta erro)"
```

---

### Task 2: Actions uniformes + remover wrappers de exclusão

- [ ] **Step 1: `excluirCategoria` retorna `{erro?}`**

Modify `src/app/painel/categorias/acoes.ts` — `excluirCategoria`:
```ts
export async function excluirCategoria(id: string) {
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir a categoria." };
  revalidatePath("/painel/categorias");
  return { ok: true };
}
```

- [ ] **Step 2: `excluirLancamento` retorna `{erro?}`**

Modify `src/app/painel/lancamentos/acoes.ts` — `excluirLancamento` (manter as 3 revalidações):
```ts
export async function excluirLancamento(id: string) {
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir o lançamento." };
  revalidatePath("/painel");
  revalidatePath("/painel/lancamentos");
  revalidatePath("/painel/itens");
  return { ok: true };
}
```

- [ ] **Step 3: Remover wrappers de exclusão sem uso**

Remover as funções (e só elas):
- `src/app/painel/clientes/acoes.ts`: `excluirClienteForm`
- `src/app/painel/itens/acoes.ts`: `excluirItemForm`
- `src/app/painel/a-receber/acoes.ts`: `excluirReceberForm`
- `src/app/painel/locacoes/acoes.ts`: `excluirLocacaoForm` (MANTER `marcarDevolucaoForm`)

(As actions `excluirCliente`/`excluirItem`/`excluirReceber`/`excluirLocacao` — que já retornam `{erro}` — ficam.)

- [ ] **Step 4: Commit** (após a Task 3 trocar os usos; ver ordem no Step de build da Task 3)

---

### Task 3: Aplicar nas telas (EstadoVazio + BotaoExcluir)

Em cada página: (a) importar `EstadoVazio`/`BotaoExcluir` e o ícone lucide; (b) trocar `<form action={excluir…}>…</form>` por `<BotaoExcluir acao={excluir…} id={…} />` (usar a action que retorna objeto); (c) trocar o `<li>…Nenhum…</li>` por `{lista.length === 0 ? <EstadoVazio … /> : <ul>…</ul>}`.

- [ ] **Step 1: `categorias/page.tsx`**
  - Import `BotaoExcluir`, `EstadoVazio`, `Tags` (lucide) e `criarCategoria` já existe.
  - Delete: `<BotaoExcluir acao={excluirCategoria} id={c.id} />`.
  - Vazio (por seção Entradas/Saídas, quando ambas vazias, ou lista geral): se `lista.length === 0`, mostrar `<EstadoVazio Icone={Tags} titulo="Nenhuma categoria ainda" descricao="Crie categorias para organizar suas entradas e saídas." />` no lugar das duas listas.

- [ ] **Step 2: `lancamentos/page.tsx`**
  - `<BotaoExcluir acao={excluirLancamento} id={l.id} />` no lugar do form.
  - `{lancamentos.length === 0 ? <EstadoVazio Icone={ScrollText} titulo="Nenhum lançamento no período" descricao="Ajuste o filtro ou registre uma entrada/saída no formulário acima." /> : <ul>…</ul>}`.

- [ ] **Step 3: `clientes/page.tsx`**
  - `<BotaoExcluir acao={excluirCliente} id={c.id} />` (import `excluirCliente`, não o Form).
  - `{clientes.length === 0 ? <EstadoVazio Icone={Users} titulo="Nenhum cliente ainda" descricao="Seus clientes aparecem aqui conforme você registra vendas fiado e locações." /> : <ul>…</ul>}`.

- [ ] **Step 4: `itens/page.tsx`** (duas seções)
  - Venda: `<BotaoExcluir acao={excluirItem} id={it.id} />`; vazio `<EstadoVazio Icone={Package} titulo="Nenhum produto ainda" descricao="Cadastre seu primeiro produto no formulário acima para vender com baixa de estoque." />`.
  - Aluguel: mesmo `BotaoExcluir`; vazio `<EstadoVazio Icone={PackageOpen} titulo="Nenhum item de aluguel" descricao="Cadastre um item acima para começar a registrar locações." />`.
  - (import `excluirItem` no lugar de `excluirItemForm`; ícones `Package`, `PackageOpen`.)

- [ ] **Step 5: `a-receber/page.tsx`**
  - `<BotaoExcluir acao={excluirReceber} id={r.id} />` (import `excluirReceber`).
  - Abertas vazias: `<EstadoVazio Icone={HandCoins} titulo="Nenhuma conta em aberto" descricao="As vendas a prazo que você registrar aparecem aqui até serem pagas." />`.
  - (marcar pago/desmarcar continuam com `marcarPagoForm`/`desmarcarPagoForm`.)

- [ ] **Step 6: `locacoes/page.tsx`**
  - `<BotaoExcluir acao={excluirLocacao} id={l.id} />` (import `excluirLocacao`; manter `marcarDevolucaoForm` no `<form action>`).
  - Abertas vazias: `<EstadoVazio Icone={PackageOpen} titulo="Nenhuma locação em aberto" descricao="Quando você alugar um item, ele aparece aqui até a devolução." />`.

- [ ] **Step 7: Build + testes**

Run: `npm run build` (se `.next` der erro OneDrive: `rm -rf .next` e repetir) e `npm test` → verdes. Conferir que não sobrou import de wrapper removido.

- [ ] **Step 8: Commit**
```bash
git add src/app/painel
git commit -m "feat: estados vazios que orientam + delete com confirmacao e feedback nas telas"
```

---

## Self-Review (cobertura da spec)

- **EstadoVazio compartilhado + copy por lista** → Tasks 1 e 3. ✓
- **BotaoExcluir (confirma + reporta erro)** → Tasks 1 e 3. ✓
- **excluirCategoria/excluirLancamento retornam {erro}** → Task 2. ✓
- **Remover wrappers de exclusão sem uso; manter marcar*Form** → Task 2. ✓
- **Sem migration; tokens; sem opacidade em token var** → respeitado. ✓
