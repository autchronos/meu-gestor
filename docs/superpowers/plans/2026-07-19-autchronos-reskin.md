# Autchronos Re-skin Institucional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o design institucional refinado (Lovable) em todas as telas: fonte Cormorant Garamond, cantos retos, hero navy com saldo dourado, gráfico de 2 linhas, e navegação responsiva (sidebar no desktop / bottom-nav + drawer no mobile + FAB novo lançamento).

**Architecture:** Re-skin puramente visual — nenhuma lógica/dado/RLS/action muda. Fundação nova (fontes + tokens + ícones lucide), um sistema de navegação responsiva compartilhado, e restyle de cada tela usando os mesmos padrões (cards quadrados, `rule`, UPPERCASE, `tabular-nums`).

**Tech Stack:** Next.js 14 · TS · Tailwind · lucide-react (novo) · Recharts · next/font (Cormorant Garamond + Inter) · Vitest.

## Global Constraints

- **Paleta INALTERADA** (tokens hex atuais): `marca #0A2540` (navy), `dourado #C9A227`, `entrada #1B7A4B`, `saida #9B2335`, `fundo #F7F8FA`, `superficie #FFFFFF`, `borda #E3E7ED`, `texto #1A2433`, `texto-suave #5A6675`. Interface pt-BR.
- **Regra de cor:** navy nunca representa dinheiro; **o saldo em destaque é dourado** (sobre navy); **verde/vinho são exclusivos de entrada/saída**.
- **Fonte serifada = Cormorant Garamond** (logo + números grandes); **Inter** no corpo; `tabular-nums` nos números.
- **Cantos retos**: cards/seções/nav **sem `rounded-*`**; inputs/botões podem manter `rounded-md`.
- **Nav responsiva:** sidebar (`lg:`+) / bottom-nav + FAB + drawer (`< lg`). Item ativo dourado, labels UPPERCASE.
- **NÃO mudar** rotas, server actions, queries, gating de flags, nem os testes de lógica existentes.
- Alias `@/*` → `./src/*`. Build pode travar no 1º run (Windows `0xC0000409`) — rodar de novo. `npm test` sempre verde antes de commit.

---

## Estrutura de arquivos (re-skin)

```
src/app/layout.tsx                 (modificar: fontes Cormorant+Inter)
src/app/globals.css                (modificar: tabular-nums, tokens extra)
tailwind.config.ts                 (modificar: fontFamily serif já usa var; ok)
src/lib/caixa/fluxoES.ts           (novo: serieEntradaSaida)  + tests
src/components/ui/ValorDestaque.tsx (novo)
src/lib/nav/itens.tsx              (novo: config de itens da nav, lucide)
src/components/nav/Sidebar.tsx, DrawerNav.tsx, BottomNav.tsx, BotaoNovo.tsx (novos)
src/app/painel/layout.tsx          (modificar: usa a nav responsiva)
src/app/painel/relatorios/page.tsx (novo: stub "em breve")
src/components/painel/CardsSaldo.tsx, GraficoFluxo.tsx, UltimosLancamentos.tsx, CardProLabore.tsx (re-skin)
src/app/painel/page.tsx            (re-skin: hero navy)
src/app/painel/lancamentos/*, categorias/*, retiradas/*, configuracoes/* (re-skin)
src/app/page.tsx (landing), entrar/page.tsx, onboarding/* (re-skin)
tests/fluxoES.test.ts
```

---

### Task 1: Fundação — fontes, tokens, ícones, `serieEntradaSaida`, `ValorDestaque`

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/lib/caixa/fluxoES.ts`, `src/components/ui/ValorDestaque.tsx`
- Test: `tests/fluxoES.test.ts`

**Interfaces:**
- Produces: fontes Cormorant/Inter; `serieEntradaSaida(lancs, hoje): {dia,entrada,saida}[]`; `<ValorDestaque valor />`; lucide-react instalado.

- [ ] **Step 1: Instalar lucide-react**

Run:
```bash
npm install lucide-react
```

- [ ] **Step 2: Trocar a fonte serifada para Cormorant Garamond**

Modify `src/app/layout.tsx` — troque o import/uso de Lora por Cormorant_Garamond:
```tsx
import { Inter, Cormorant_Garamond } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-sans" });
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-serif",
});
```
E no `<html>` use `${inter.variable} ${serif.variable}` (substituindo `lora.variable`). O resto do arquivo (metadata, viewport, script anti-flash) permanece.

- [ ] **Step 3: Ajustes no `globals.css`**

Modify `src/app/globals.css` — adicione dentro do bloco `:root` os tokens extra e ajuste o `body`:
```css
:root {
  /* ...tokens existentes... */
  --cor-navy-profundo: #0A1B30;
  --cor-dourado-suave: #E0C868;
}
```
E troque a regra `body { ... }` por:
```css
body {
  background-color: var(--cor-fundo);
  color: var(--cor-texto);
  font-feature-settings: "tnum" 1, "lnum" 1;
  -webkit-font-smoothing: antialiased;
}
```
Adicione ao `.dark` os mesmos dois tokens (valores iguais ou escuros; para o re-skin claro, pode repetir):
```css
.dark {
  /* ...existentes... */
  --cor-navy-profundo: #06101E;
  --cor-dourado-suave: #E0C868;
}
```
E registre os tokens no Tailwind: em `tailwind.config.ts`, dentro de `colors`, adicione:
```ts
        "navy-profundo": "var(--cor-navy-profundo)",
        "dourado-suave": "var(--cor-dourado-suave)",
```

- [ ] **Step 4: Teste de `serieEntradaSaida` (falha primeiro)**

Create `tests/fluxoES.test.ts`:
```ts
import { serieEntradaSaida } from "@/lib/caixa/fluxoES";

const L = (data: string, tipo: "entrada" | "saida", valor: number) => ({ data, tipo, valor });

test("agrega entradas e saídas por dia, 30 pontos terminando hoje", () => {
  const s = serieEntradaSaida(
    [L("2026-07-03", "entrada", 100), L("2026-07-03", "saida", 40), L("2026-07-02", "entrada", 20)],
    new Date("2026-07-03T12:00:00"),
  );
  expect(s).toHaveLength(30);
  expect(s[s.length - 1]).toEqual({ dia: "03/07", entrada: 100, saida: 40 });
  expect(s[s.length - 2]).toEqual({ dia: "02/07", entrada: 20, saida: 0 });
});

test("ignora lançamentos fora da janela de 30 dias", () => {
  const s = serieEntradaSaida([L("2026-05-01", "entrada", 999)], new Date("2026-07-03T12:00:00"));
  expect(s.reduce((a, p) => a + p.entrada, 0)).toBe(0);
});
```

- [ ] **Step 5: Rodar para confirmar a falha**

Run: `npm test -- fluxoES`
Expected: FAIL "Cannot find module '@/lib/caixa/fluxoES'".

- [ ] **Step 6: Implementar `fluxoES.ts`**

Create `src/lib/caixa/fluxoES.ts`:
```ts
export interface LancDia {
  data: string; // YYYY-MM-DD
  tipo: "entrada" | "saida";
  valor: number;
}
export interface PontoES {
  dia: string; // DD/MM
  entrada: number;
  saida: number;
}

export function serieEntradaSaida(lancs: LancDia[], hoje: Date): PontoES[] {
  const dias: { iso: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dias.push({ iso: `${d.getFullYear()}-${mm}-${dd}`, label: `${dd}/${mm}` });
  }
  const ini = dias[0].iso;
  const fim = dias[dias.length - 1].iso;
  const mE = new Map<string, number>();
  const mS = new Map<string, number>();
  for (const l of lancs) {
    if (l.data < ini || l.data > fim) continue;
    const m = l.tipo === "entrada" ? mE : mS;
    m.set(l.data, (m.get(l.data) ?? 0) + l.valor);
  }
  return dias.map(({ iso, label }) => ({
    dia: label,
    entrada: mE.get(iso) ?? 0,
    saida: mS.get(iso) ?? 0,
  }));
}
```

- [ ] **Step 7: Rodar para confirmar verde**

Run: `npm test -- fluxoES`
Expected: PASS (2 testes).

- [ ] **Step 8: `ValorDestaque`**

Create `src/components/ui/ValorDestaque.tsx`:
```tsx
import { formatarBRL } from "@/lib/formato";

// Valor grande em destaque (dourado, serifado, tabular). Usado no hero de saldo
// sobre a faixa navy — dourado sobre navy tem contraste alto.
export function ValorDestaque({
  valor,
  className = "",
}: {
  valor: number;
  className?: string;
}) {
  return (
    <span className={`font-serif tabular-nums text-dourado ${className}`}>
      {formatarBRL(valor)}
    </span>
  );
}
```

- [ ] **Step 9: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes. (A troca Lora→Cormorant não quebra nada; os tokens novos são aditivos.)

```bash
git add package.json package-lock.json src/app/layout.tsx src/app/globals.css tailwind.config.ts src/lib/caixa/fluxoES.ts src/components/ui/ValorDestaque.tsx tests/fluxoES.test.ts
git commit -m "feat: fundacao do re-skin (Cormorant + tokens + lucide + serieEntradaSaida + ValorDestaque)"
```

---

### Task 2: Navegação responsiva (sidebar / bottom-nav / drawer / FAB)

**Files:**
- Create: `src/lib/nav/itens.tsx`, `src/components/nav/Sidebar.tsx`, `src/components/nav/DrawerNav.tsx`, `src/components/nav/BottomNav.tsx`
- Modify: `src/app/painel/layout.tsx`
- Create: `src/app/painel/relatorios/page.tsx`
- Delete: `src/components/painel/NavInferior.tsx` (substituído)

**Interfaces:**
- Consumes: `negocioAtual` (flags), `sair`, lucide icons.
- Produces: `itensNav(flags)`; `<Sidebar>`, `<DrawerNav>`, `<BottomNav>` alimentados pelas flags.

- [ ] **Step 1: Config dos itens de navegação**

Create `src/lib/nav/itens.tsx`:
```tsx
import {
  LayoutGrid, ScrollText, ArrowUpFromLine, Tags, BarChart3, Settings,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  soMobileNoDrawer?: boolean; // aparece no drawer/sidebar, não na bottom-nav
}

interface Flags {
  usa_carteiras: boolean;
}

export function itensNav(flags: Flags): ItemNav[] {
  const itens: ItemNav[] = [
    { href: "/painel", rotulo: "Início", Icone: LayoutGrid },
    { href: "/painel/lancamentos", rotulo: "Lançamentos", Icone: ScrollText },
  ];
  if (flags.usa_carteiras) {
    itens.push({ href: "/painel/retiradas", rotulo: "Retiradas", Icone: ArrowUpFromLine, soMobileNoDrawer: true });
  }
  itens.push({ href: "/painel/categorias", rotulo: "Categorias", Icone: Tags, soMobileNoDrawer: true });
  itens.push({ href: "/painel/relatorios", rotulo: "Relatórios", Icone: BarChart3 });
  itens.push({ href: "/painel/configuracoes", rotulo: "Config", Icone: Settings });
  return itens;
}

export function ehAtivo(pathname: string, href: string): boolean {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(`${href}/`);
}
```

- [ ] **Step 2: Botão "Novo lançamento" (FAB / CTA) — parte do BottomNav e Sidebar**

(sem arquivo próprio; o link `/painel/lancamentos?novo=1` é usado nos componentes abaixo.)

- [ ] **Step 3: Sidebar (desktop)**

Create `src/components/nav/Sidebar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Plus } from "lucide-react";
import { itensNav, ehAtivo } from "@/lib/nav/itens";
import { sair } from "@/app/painel/acoes";

export function Sidebar({ usaCarteiras, nome }: { usaCarteiras: boolean; nome: string }) {
  const path = usePathname();
  const itens = itensNav({ usa_carteiras: usaCarteiras });
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-borda bg-marca text-white lg:flex">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <Landmark className="h-5 w-5 text-dourado" />
        <span className="font-serif text-xl">Autchronos</span>
      </div>
      <p className="px-5 pt-4 text-[11px] uppercase tracking-[0.16em] text-white/50">{nome}</p>
      <Link href="/painel/lancamentos?novo=1"
        className="mx-5 mt-3 flex items-center justify-center gap-2 bg-dourado px-4 py-2 text-sm font-semibold uppercase tracking-wider text-marca hover:bg-dourado-suave">
        <Plus className="h-4 w-4" strokeWidth={2.5} /> Novo lançamento
      </Link>
      <nav className="mt-5 flex-1">
        {itens.map((i) => {
          const ativo = ehAtivo(path, i.href);
          return (
            <Link key={i.href} href={i.href} aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-3 px-5 py-3 text-sm uppercase tracking-wider ${ativo ? "border-l-2 border-dourado text-dourado" : "text-white/70 hover:text-white"}`}>
              <i.Icone className="h-4 w-4" /> {i.rotulo}
            </Link>
          );
        })}
      </nav>
      <form action={sair} className="border-t border-white/10 px-5 py-4">
        <button type="submit" className="text-xs uppercase tracking-wider text-white/60 hover:text-white">Sair</button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 4: DrawerNav (mobile, hambúrguer)**

Create `src/components/nav/DrawerNav.tsx`:
```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Menu, X } from "lucide-react";
import { itensNav, ehAtivo } from "@/lib/nav/itens";
import { sair } from "@/app/painel/acoes";

export function DrawerNav({ usaCarteiras, nome }: { usaCarteiras: boolean; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const path = usePathname();
  const itens = itensNav({ usa_carteiras: usaCarteiras });
  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 bg-marca px-4 py-3 text-white lg:hidden">
        <button aria-label="Menu" onClick={() => setAberto(true)}><Menu className="h-5 w-5" /></button>
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-dourado" />
          <span className="font-serif text-lg">Autchronos</span>
        </div>
        <form action={sair}><button type="submit" className="text-xs uppercase tracking-wider text-white/60">Sair</button></form>
      </header>
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-marca text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-serif text-lg">{nome}</span>
              <button aria-label="Fechar" onClick={() => setAberto(false)}><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1">
              {itens.map((i) => {
                const ativo = ehAtivo(path, i.href);
                return (
                  <Link key={i.href} href={i.href} onClick={() => setAberto(false)}
                    className={`flex items-center gap-3 px-5 py-3 text-sm uppercase tracking-wider ${ativo ? "text-dourado" : "text-white/70"}`}>
                    <i.Icone className="h-4 w-4" /> {i.rotulo}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 5: BottomNav (mobile) com FAB central**

Create `src/components/nav/BottomNav.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ScrollText, BarChart3, Settings, Plus } from "lucide-react";
import { ehAtivo } from "@/lib/nav/itens";

const ESQ = [
  { href: "/painel", rotulo: "Início", Icone: LayoutGrid },
  { href: "/painel/lancamentos", rotulo: "Lanç.", Icone: ScrollText },
];
const DIR = [
  { href: "/painel/relatorios", rotulo: "Relat.", Icone: BarChart3 },
  { href: "/painel/configuracoes", rotulo: "Config", Icone: Settings },
];

export function BottomNav() {
  const path = usePathname();
  const item = (i: { href: string; rotulo: string; Icone: typeof LayoutGrid }) => {
    const ativo = ehAtivo(path, i.href);
    return (
      <Link key={i.href} href={i.href} aria-current={ativo ? "page" : undefined}
        className={`flex flex-col items-center gap-1 py-2 text-[10px] uppercase tracking-wider ${ativo ? "text-dourado" : "text-white/70"}`}>
        <i.Icone className="h-4 w-4" /> {i.rotulo}
      </Link>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-marca text-white lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        {ESQ.map(item)}
        <div className="flex justify-center">
          <Link href="/painel/lancamentos?novo=1" aria-label="Novo lançamento"
            className="-mt-5 grid h-12 w-12 place-items-center border border-dourado bg-dourado text-marca shadow-[0_2px_0_0_rgba(0,0,0,0.15)]">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </Link>
        </div>
        {DIR.map(item)}
      </div>
    </nav>
  );
}
```

- [ ] **Step 6: Stub `/painel/relatorios`**

Create `src/app/painel/relatorios/page.tsx`:
```tsx
export default function Relatorios() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl text-marca">Relatórios</h1>
      <div className="border border-borda bg-superficie p-6 text-sm text-texto-suave">
        Metas, comparativo mês a mês e exportação em CSV chegam já já (Fase 3C).
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Novo `painel/layout.tsx`**

Modify `src/app/painel/layout.tsx` — substitua o arquivo inteiro por:
```tsx
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { Sidebar } from "@/components/nav/Sidebar";
import { DrawerNav } from "@/components/nav/DrawerNav";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const negocio = await negocioAtual();
  if (!negocio) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar usaCarteiras={negocio.usa_carteiras} nome={negocio.nome} />
      <DrawerNav usaCarteiras={negocio.usa_carteiras} nome={negocio.nome} />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 8: Remover o antigo NavInferior**

Run:
```bash
git rm src/components/painel/NavInferior.tsx
```

- [ ] **Step 9: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

Verificação manual (não bloqueia): `npm run dev`, no desktop ver a sidebar; no mobile ver a bottom-nav + FAB + o hambúrguer abrindo o drawer.

```bash
git add -A
git commit -m "feat: navegacao responsiva (sidebar/drawer/bottom-nav + FAB) e stub Relatorios"
```

---

### Task 3: Re-skin do Dashboard (hero navy, cards, gráfico de 2 linhas, extrato)

**Files:**
- Modify: `src/components/painel/CardsSaldo.tsx`, `GraficoFluxo.tsx`, `UltimosLancamentos.tsx`, `CardProLabore.tsx`, `src/app/painel/page.tsx`

**Interfaces:**
- Consumes: `resumo_dashboard`, `serieEntradaSaida` (Task 1), `ValorDestaque` (Task 1), `formatarBRL`, lucide.

- [ ] **Step 1: `CardsSaldo` (hero navy + cards de métrica)**

Modify `src/components/painel/CardsSaldo.tsx` — substitua por:
```tsx
import { ValorDestaque } from "@/components/ui/ValorDestaque";
import { formatarBRL } from "@/lib/formato";

export function CardsSaldo({
  disponivel, aReceber, entradasMes, saidasMes, mostrarAReceber,
}: { disponivel: number; aReceber: number; entradasMes: number; saidasMes: number; mostrarAReceber: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-marca px-5 py-6 text-white">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/70">
          <span className="h-2 w-2 bg-dourado" /> Disponível hoje
        </div>
        <p className="mt-2"><ValorDestaque valor={disponivel} className="text-4xl md:text-5xl" /></p>
        {mostrarAReceber && (
          <p className="mt-2 text-xs text-white/70">
            A receber: <span className="tabular-nums">{formatarBRL(aReceber)}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metrica label="Entradas do mês" valor={entradasMes} cor="text-entrada" />
        <Metrica label="Saídas do mês" valor={saidasMes} cor="text-saida" />
      </div>
    </div>
  );
}

function Metrica({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="border border-borda bg-superficie p-4">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 ${cor === "text-entrada" ? "bg-entrada" : "bg-saida"}`} />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${cor}`}>{formatarBRL(valor)}</p>
    </div>
  );
}
```

- [ ] **Step 2: `GraficoFluxo` — duas linhas (entradas/saídas)**

Modify `src/components/painel/GraficoFluxo.tsx` — substitua por:
```tsx
"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PontoES } from "@/lib/caixa/fluxoES";
import { formatarBRL } from "@/lib/formato";

export function GraficoFluxo({ serie, liquido }: { serie: PontoES[]; liquido: number }) {
  return (
    <div className="border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Fluxo de caixa</h2>
        <span className="text-xs text-texto-suave">Últimos 30 dias</span>
      </div>
      <div className="px-3 py-4">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 4, right: 4, top: 4 }}>
              <XAxis dataKey="dia" interval={6} tick={{ fontSize: 10 }} stroke="var(--cor-texto-suave)" />
              <YAxis hide />
              <Tooltip formatter={(v: number | string) => (typeof v === "number" ? formatarBRL(v) : v)} />
              <Area type="monotone" dataKey="entrada" stroke="var(--cor-entrada)" fill="var(--cor-entrada)" fillOpacity={0.08} strokeWidth={1.5} />
              <Area type="monotone" dataKey="saida" stroke="var(--cor-saida)" fill="var(--cor-saida)" fillOpacity={0.08} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-borda px-2 pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-texto-suave"><span className="h-2 w-2 bg-entrada" /> Entradas</span>
          <span className="flex items-center gap-1.5 text-texto-suave"><span className="h-2 w-2 bg-saida" /> Saídas</span>
          <span className="tabular-nums text-marca">Líquido: <span className="font-semibold">{formatarBRL(liquido)}</span></span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `UltimosLancamentos` — estilo extrato**

Modify `src/components/painel/UltimosLancamentos.tsx` — substitua por:
```tsx
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ScrollText } from "lucide-react";
import { formatarBRL } from "@/lib/formato";

interface Item { id: string; descricao: string; valor: number; tipo: "entrada" | "saida"; data: string }

export function UltimosLancamentos({ itens }: { itens: Item[] }) {
  return (
    <div className="border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-dourado" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Últimos lançamentos</h2>
        </div>
        <Link href="/painel/lancamentos" className="flex items-center gap-1 text-xs font-medium text-marca hover:underline">
          Ver extrato <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul>
        {itens.map((l, idx) => (
          <li key={l.id} className={`flex items-center gap-3 px-5 py-3 ${idx !== itens.length - 1 ? "border-b border-borda" : ""}`}>
            <div className={`grid h-8 w-8 shrink-0 place-items-center border ${l.tipo === "entrada" ? "border-entrada/30 text-entrada" : "border-saida/30 text-saida"}`}>
              {l.tipo === "entrada" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-marca">{l.descricao}</p>
              <p className="truncate text-xs text-texto-suave">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${l.tipo === "entrada" ? "text-entrada" : "text-saida"}`}>
              {l.tipo === "entrada" ? "+" : "−"}{formatarBRL(l.valor)}
            </span>
          </li>
        ))}
        {itens.length === 0 && <li className="px-5 py-8 text-center text-sm text-texto-suave">Nada ainda. Faça seu primeiro lançamento.</li>}
      </ul>
    </div>
  );
}
```

Nota: `border-entrada/30` usa opacidade sobre a cor do token via CSS var — o Tailwind não injeta alpha em `var()`. Se o build/visual não aplicar a opacidade, troque por `border-entrada` (sem `/30`). Verifique no `npm run dev`.

- [ ] **Step 4: `CardProLabore` — quadrado + barra**

Modify `src/components/painel/CardProLabore.tsx` — substitua por:
```tsx
import Link from "next/link";
import { formatarBRL } from "@/lib/formato";

export function CardProLabore({ retirado, limite }: { retirado: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((retirado / limite) * 100)) : 0;
  const passou = retirado > limite;
  return (
    <Link href="/painel/retiradas" className="block border border-borda bg-superficie p-4 hover:border-dourado">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">Pró-labore este mês</p>
      <p className="mt-1 text-texto">
        Você já retirou <span className="font-semibold tabular-nums text-saida">{formatarBRL(retirado)}</span> de <span className="tabular-nums">{formatarBRL(limite)}</span>.
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden bg-borda">
        <div className={`h-full ${passou ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
      </div>
      {passou && <p className="mt-1 text-xs text-saida">Você ultrapassou o limite de pró-labore.</p>}
    </Link>
  );
}
```

- [ ] **Step 5: Dashboard `page.tsx`**

Modify `src/app/painel/page.tsx` — substitua por:
```tsx
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { serieEntradaSaida } from "@/lib/caixa/fluxoES";
import { CardsSaldo } from "@/components/painel/CardsSaldo";
import { GraficoFluxo } from "@/components/painel/GraficoFluxo";
import { UltimosLancamentos } from "@/components/painel/UltimosLancamentos";
import { CardProLabore } from "@/components/painel/CardProLabore";

export default async function Painel() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();

  const { data: resumo } = await supabase.rpc("resumo_dashboard", { p_negocio_id: negocio.id });
  const r = resumo ?? { disponivel: 0, a_receber: 0, entradas_mes: 0, saidas_mes: 0, retirado_mes: 0, limite_prolabore: 0 };

  const hojeStr = hojeSP();
  const [y, m, d] = hojeStr.split("-").map(Number);
  const de = new Date(Date.UTC(y, m - 1, d - 29)).toISOString().slice(0, 10);
  const hoje = new Date(hojeStr + "T12:00:00");

  const { data: lancs30 } = await supabase
    .from("lancamentos").select("data, tipo, valor")
    .eq("negocio_id", negocio.id).eq("carteira", "empresa").gte("data", de).order("data");
  const { data: ultimos } = await supabase
    .from("lancamentos").select("id, descricao, valor, tipo, data")
    .eq("negocio_id", negocio.id)
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(10);

  const serie = serieEntradaSaida(
    (lancs30 ?? []).map((l) => ({ data: l.data, tipo: l.tipo, valor: Number(l.valor) })),
    hoje,
  );
  const liquido = Number(r.entradas_mes) - Number(r.saidas_mes);

  return (
    <section className="flex flex-col gap-4">
      <CardsSaldo
        disponivel={Number(r.disponivel)}
        aReceber={Number(r.a_receber)}
        entradasMes={Number(r.entradas_mes)}
        saidasMes={Number(r.saidas_mes)}
        mostrarAReceber={negocio.usa_fiado}
      />
      {negocio.usa_carteiras && Number(r.limite_prolabore) > 0 && (
        <CardProLabore retirado={Number(r.retirado_mes)} limite={Number(r.limite_prolabore)} />
      )}
      <GraficoFluxo serie={serie} liquido={liquido} />
      <UltimosLancamentos itens={(ultimos ?? []).map((l) => ({ ...l, valor: Number(l.valor) }))} />
    </section>
  );
}
```

- [ ] **Step 6: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

```bash
git add src/components/painel/CardsSaldo.tsx src/components/painel/GraficoFluxo.tsx src/components/painel/UltimosLancamentos.tsx src/components/painel/CardProLabore.tsx src/app/painel/page.tsx
git commit -m "feat: re-skin do dashboard (hero navy dourado, grafico 2 linhas, extrato)"
```

---

### Task 4: Re-skin das telas internas (lançamentos, categorias, retiradas, config)

**Files:** modificar as páginas/forms dessas rotas aplicando os padrões (cards quadrados, `border-b border-borda`, UPPERCASE, `tabular-nums`, ícones lucide onde couber). A LÓGICA não muda — só classes/markup.

**Interfaces:** nenhuma nova; consome os padrões do design.

- [ ] **Step 1: Lançamentos — abrir o form via `?novo=1` e re-skin da lista**

Modify `src/app/painel/lancamentos/page.tsx`:
- Troque o `<details>` do "Novo lançamento" para abrir por padrão quando `searchParams.novo === "1"` (o FAB manda `?novo=1`): use `<details open={searchParams?.novo === "1"}>` e adicione `novo?: string` ao tipo de `searchParams`.
- Cabeçalho e cards: cards `border border-borda bg-superficie` (sem rounded); título `font-serif text-xl text-marca`; filtros e lista com `border-b border-borda`; valores `tabular-nums`. Substitua ícone "×" do excluir por `Trash2` do lucide (opcional).

Substitua o arquivo por (ajuste de estilo + `?novo`):
```tsx
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { formatarBRL } from "@/lib/formato";
import { hojeSP, intervaloPeriodo } from "@/lib/caixa/periodo";
import { FormLancamento } from "@/app/painel/lancamentos/FormLancamento";
import { excluirLancamento } from "@/app/painel/lancamentos/acoes";

export default async function Lancamentos({
  searchParams,
}: { searchParams: { periodo?: string; tipo?: string; origem?: string; novo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const hojeStr = hojeSP();

  const { data: categorias } = await supabase
    .from("categorias").select("id, nome, tipo").eq("negocio_id", negocio.id).order("nome");

  let q = supabase.from("lancamentos")
    .select("id, tipo, descricao, valor, data, origem, eh_retirada")
    .eq("negocio_id", negocio.id)
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(200);

  const range = intervaloPeriodo(searchParams.periodo, hojeStr);
  if (range) q = q.gte("data", range.de).lte("data", range.ate);
  if (searchParams.tipo === "entrada" || searchParams.tipo === "saida") q = q.eq("tipo", searchParams.tipo);
  if (searchParams.origem === "app" || searchParams.origem === "whatsapp") q = q.eq("origem", searchParams.origem);
  const { data: lancamentos } = await q;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl text-marca">Lançamentos</h1>

      <details open={searchParams?.novo === "1"} className="border border-borda bg-superficie">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Novo lançamento</summary>
        <div className="border-t border-borda p-4">
          <FormLancamento categorias={categorias ?? []} usaCarteiras={negocio.usa_carteiras} hoje={hojeStr} />
        </div>
      </details>

      <form method="get" className="flex flex-wrap gap-2 text-sm">
        <select name="periodo" defaultValue={searchParams.periodo ?? "mes_atual"} className="border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="mes_atual">Mês atual</option>
          <option value="mes_passado">Mês passado</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="tudo">Tudo</option>
        </select>
        <select name="tipo" defaultValue={searchParams.tipo ?? ""} className="border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option>
        </select>
        <select name="origem" defaultValue={searchParams.origem ?? ""} className="border border-borda bg-superficie px-2 py-1 text-texto">
          <option value="">Toda origem</option><option value="app">App</option><option value="whatsapp">WhatsApp</option>
        </select>
        <button type="submit" className="border border-borda px-3 py-1 uppercase tracking-wider text-texto-suave hover:text-texto">Filtrar</button>
      </form>

      <ul className="border border-borda bg-superficie">
        {(lancamentos ?? []).map((l, idx) => (
          <li key={l.id} className={`flex items-center justify-between gap-2 px-5 py-3 text-sm ${idx !== (lancamentos ?? []).length - 1 ? "border-b border-borda" : ""}`}>
            <div className="min-w-0">
              <p className="truncate text-marca">{l.descricao}{l.eh_retirada ? " (retirada)" : ""}</p>
              <p className="text-xs text-texto-suave">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")} · {l.origem}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`tabular-nums ${l.tipo === "entrada" ? "text-entrada" : "text-saida"}`}>
                {l.tipo === "entrada" ? "+" : "−"}{formatarBRL(Number(l.valor))}
              </span>
              <form action={excluirLancamento.bind(null, l.id)}>
                <button type="submit" className="text-xs text-texto-suave hover:text-saida">excluir</button>
              </form>
            </div>
          </li>
        ))}
        {(lancamentos ?? []).length === 0 && <li className="px-5 py-8 text-center text-sm text-texto-suave">Nenhum lançamento no período.</li>}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: `FormLancamento` — cantos retos**

Modify `src/app/painel/lancamentos/FormLancamento.tsx` — troque as classes de card/botão para o novo estilo: o container dos botões de tipo e os campos sem `rounded` (ou `rounded-none`); botão salvar `bg-marca` quadrado. (Somente classes; a lógica e os handlers permanecem.) Especificamente: nas strings de `className`, remova `rounded-md`/`rounded-md` dos inputs se quiser cantos retos, e no botão de tipo mantenha `border` sem `rounded`. Mantenha `campo` como `w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto`.

- [ ] **Step 3: Categorias — cards quadrados**

Modify `src/app/painel/categorias/page.tsx` e `FormCategoria.tsx`: trocar `rounded-md`/`rounded-lg` por sem-raio; listas com `border border-borda` e itens `border-b border-borda`; título `font-serif text-2xl text-marca`; labels de seção UPPERCASE. (Só classes.)

- [ ] **Step 4: Retiradas — cards quadrados, número serif**

Modify `src/app/painel/retiradas/page.tsx`, `FormLimite.tsx`, `FormRetirada.tsx`: cards `border border-borda bg-superficie` (sem rounded); "Retirado no mês" em `font-serif ... tabular-nums`; barra sem rounded (`overflow-hidden`); título `font-serif text-2xl text-marca`. (Só classes.)

- [ ] **Step 5: Configurações — quadrado**

Modify `src/app/painel/configuracoes/page.tsx`, `FormCapacidades.tsx`: cards/labels sem rounded; título `font-serif text-2xl text-marca`. (Só classes.)

- [ ] **Step 6: Build, testes e commit**

Run: `npm run build` (retry se `0xC0000409`) e `npm test` → verdes.

```bash
git add src/app/painel/lancamentos src/app/painel/categorias src/app/painel/retiradas src/app/painel/configuracoes
git commit -m "feat: re-skin das telas internas (extrato, cards quadrados, ?novo)"
```

---

### Task 5: Re-skin das telas públicas (landing, entrar, onboarding)

**Files:** `src/app/page.tsx` (landing), `src/components/*` da landing, `src/app/entrar/page.tsx`, `src/app/onboarding/*`.

- [ ] **Step 1: Landing** — aplicar Cormorant no hero/títulos (já usam `font-serif`), cards de recurso `border border-borda` sem rounded, seções com `border-t border-borda`, botões `bg-marca` quadrados. Ajuste só de classes nos componentes `Header`, `Hero`, `SecaoRecursos`, `SecaoComoFunciona`, `Footer`. Mantém conteúdo.

- [ ] **Step 2: `/entrar`** — card `border border-borda bg-superficie` sem rounded; logo serifada; inputs/botões no novo estilo. (Modificar `entrar/page.tsx` + `FormularioAcesso.tsx` + `BotaoGoogle.tsx`: remover `rounded-*` de cards; manter lógica.)

- [ ] **Step 3: Onboarding** — `onboarding/page.tsx` + `Wizard.tsx`: card quadrado, título serif, checkboxes de capacidade sem rounded. (Só classes.)

- [ ] **Step 4: Build, testes, commit e verificação visual final**

Run: `npm run build` e `npm test` → verdes.

Verificação manual: `npm run dev`, percorrer TODAS as telas no mobile e no desktop conferindo o novo visual (fonte Cormorant, cantos retos, hero dourado, sidebar/bottom-nav+FAB/drawer, gráfico de 2 linhas).

```bash
git add src/app/page.tsx src/components src/app/entrar src/app/onboarding
git commit -m "feat: re-skin das telas publicas (landing, entrar, onboarding)"
```

---

## Self-Review (cobertura da spec)

- **Fonte Cormorant + tokens + tabular-nums + lucide** → Task 1. ✓
- **serieEntradaSaida (puro, testado) + ValorDestaque** → Task 1. ✓
- **Nav responsiva (sidebar/drawer/bottom-nav + FAB) + Relatórios stub** → Task 2. ✓
- **Dashboard: hero navy com saldo dourado, cards métrica, gráfico 2 linhas, extrato, pró-labore** → Task 3. ✓
- **Telas internas re-skinadas (cantos retos, extrato, ?novo)** → Task 4. ✓
- **Telas públicas re-skinadas** → Task 5. ✓
- **Regra de cor (navy≠dinheiro; saldo dourado; entrada/saída verde/vinho)** → Tasks 3/4. ✓
- **Nada de lógica/dados/RLS/rotas mudou** → só classes/markup + 2 componentes novos + nav. ✓

Fora de escopo: Fase 3C (Relatório real — o stub vira a tela). Nota de risco: `border-entrada/30` (opacidade sobre token var) pode não aplicar alpha no Tailwind; se necessário, usar `border-entrada` sólido (checar no dev).
