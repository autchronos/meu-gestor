# Referência de design — Dashboard (Lovable "autchronos-design-essence")

Componente enviado pelo usuário (Lovable: Vite + TanStack Router + lucide-react +
shadcn/Tailwind). Fonte de verdade do **re-skin** do Autchronos. Usa tokens
shadcn (`--primary`, `--card`, `--border`, `--muted-foreground`, `--background`)
+ custom (`--color-entrada`, `--color-saida`, `--color-gold`, `--color-rule`,
`gold`). Valores reais dos tokens estão no `src/index.css` do Lovable (pendente).

Refinamentos-chave observados:
- **Cantos retos** (nenhum `rounded-*`) — estética de extrato.
- Header como **faixa navy** (`bg-primary`) com o **saldo consolidado** dentro,
  número em `font-serif text-5xl` e **os centavos em dourado**.
- Logo "Autchronos" em `font-serif`, com ícone `Landmark` dourado.
- Cards `border border-border bg-card`; label uppercase com `tracking` + chip
  quadrado colorido.
- Divisórias finas via utilitários `rule-b`/`rule-t` (provável `@layer` no index.css).
- **Bottom nav navy** com 5 itens (Início/Extrato/Relatórios/Contas) + **FAB "+"
  central dourado** flutuante; ativo em `text-gold`.
- Números com `tabular-nums`. Labels uppercase com `tracking-[0.14em..0.2em]`.
- Gráfico de fluxo em SVG próprio (área + linha, entrada/saida) — parecido com o
  nosso, mas 2 linhas (entradas e saídas) em vez do saldo acumulado.

```tsx
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, Landmark, Menu,
  PieChart, Plus, ScrollText, Wallet,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const flow = [
  { d: "01", in: 1200, out: 640 }, { d: "05", in: 2100, out: 980 },
  { d: "08", in: 1650, out: 1420 }, { d: "12", in: 3100, out: 1180 },
  { d: "15", in: 980, out: 2100 }, { d: "19", in: 2450, out: 1560 },
  { d: "22", in: 3300, out: 900 }, { d: "26", in: 2780, out: 1980 },
  { d: "30", in: 1890, out: 1220 },
];

const lancamentos = [
  { id: 1, desc: "Venda — Pedido #2041", cat: "Receita de vendas", data: "30 Jul", valor: 1280.5, tipo: "in" },
  { id: 2, desc: "Fornecedor Aurora Ltda.", cat: "Insumos", data: "29 Jul", valor: 842.9, tipo: "out" },
  { id: 3, desc: "Transferência PIX — Ana M.", cat: "Serviços prestados", data: "29 Jul", valor: 450, tipo: "in" },
  { id: 4, desc: "Conta de energia — CPFL", cat: "Utilidades", data: "28 Jul", valor: 318.44, tipo: "out" },
  { id: 5, desc: "Boleto — INSS MEI", cat: "Impostos", data: "27 Jul", valor: 71.6, tipo: "out" },
  { id: 6, desc: "Recebimento cartão — Cielo", cat: "Receita de vendas", data: "27 Jul", valor: 2140.15, tipo: "in" },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <button aria-label="Menu" className="p-1 -ml-1"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-gold" />
            <span className="font-serif text-xl tracking-wide">Autchronos</span>
          </div>
          <button aria-label="Notificações" className="p-1 -mr-1 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-gold" />
          </button>
        </div>
        <div className="h-px bg-white/10" />
        <div className="mx-auto max-w-3xl px-5 pt-6 pb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/70">
            <span className="h-2 w-2 rounded-full bg-gold" />
            Saldo consolidado — Julho / 2026
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-serif text-5xl font-semibold tabular-nums text-white">
              R$ 24.318<span className="text-gold">,72</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-white/70">
            <span>Conta corrente · Banco do Brasil</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Atualizado 08:42</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="-mt-5 grid grid-cols-2 gap-3">
          <SummaryCard label="Entradas do mês" value={brl(18540.3)} hint="+12,4% vs. junho" tone="in" />
          <SummaryCard label="Saídas do mês" value={brl(11221.58)} hint="−3,1% vs. junho" tone="out" />
        </section>

        <section className="mt-8 border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 rule-b">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Fluxo de caixa</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Últimos 30 dias</p>
            </div>
            <PieChart className="h-4 w-4 text-gold" />
          </div>
          <div className="px-5 py-6">
            <CashFlowChart />
            <div className="mt-5 flex items-center justify-between rule-t pt-4 text-xs">
              <LegendDot color="var(--color-entrada)" label="Entradas" />
              <LegendDot color="var(--color-saida)" label="Saídas" />
              <span className="tabular-nums text-primary">Líquido: <span className="font-semibold">{brl(7318.72)}</span></span>
            </div>
          </div>
        </section>

        <section className="mt-8 border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 rule-b">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-gold" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Últimos lançamentos</h2>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver extrato <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul>
            {lancamentos.map((l, idx) => (
              <li key={l.id} className={"flex items-center gap-3 px-5 py-3.5 " + (idx !== lancamentos.length - 1 ? "rule-b" : "")}>
                <div className={"grid h-8 w-8 shrink-0 place-items-center border " + (l.tipo === "in" ? "border-[color:var(--color-entrada)]/25 text-[color:var(--color-entrada)]" : "border-[color:var(--color-saida)]/25 text-[color:var(--color-saida)]")}>
                  {l.tipo === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{l.desc}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.cat} · {l.data}</p>
                </div>
                <span className={"shrink-0 text-sm font-semibold tabular-nums " + (l.tipo === "in" ? "text-[color:var(--color-entrada)]" : "text-[color:var(--color-saida)]")}>
                  {l.tipo === "in" ? "+" : "−"}{brl(l.valor).replace("R$", "R$ ")}
                </span>
              </li>
            ))}
          </ul>
          <div className="rule-t px-5 py-3 text-center">
            <button className="text-xs font-medium uppercase tracking-wider text-primary hover:underline">Carregar mais movimentações</button>
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Autchronos · Instituição de gestão financeira · desde 2026
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-3xl grid-cols-5 items-center">
          <NavItem icon={<Wallet className="h-4 w-4" />} label="Início" active />
          <NavItem icon={<ScrollText className="h-4 w-4" />} label="Extrato" />
          <div className="flex justify-center">
            <button aria-label="Novo lançamento" className="-mt-5 grid h-12 w-12 place-items-center border border-[color:var(--color-gold)] bg-gold text-primary shadow-[0_2px_0_0_rgba(0,0,0,0.15)]">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
          <NavItem icon={<PieChart className="h-4 w-4" />} label="Relatórios" />
          <NavItem icon={<Landmark className="h-4 w-4" />} label="Contas" />
        </div>
      </nav>
    </div>
  );
}

function SummaryCard({ label, value, hint, tone }) {
  const color = tone === "in" ? "var(--color-entrada)" : "var(--color-saida)";
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums" style={{ color }}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (<span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2" style={{ backgroundColor: color }} />{label}</span>);
}

function NavItem({ icon, label, active }) {
  return (<button className={"flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-wider " + (active ? "text-gold" : "text-white/70")}>{icon}{label}</button>);
}

function CashFlowChart() {
  const w = 600; const h = 160; const pad = 8;
  const max = Math.max(...flow.map((f) => Math.max(f.in, f.out)));
  const stepX = (w - pad * 2) / (flow.length - 1);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const line = (key) => flow.map((f, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${y(f[key])}`).join(" ");
  const area = (key) => `${line(key)} L ${pad + (flow.length - 1) * stepX} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((t) => (<line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="var(--color-rule)" strokeWidth={1} strokeDasharray="2 4" />))}
      <path d={area("in")} fill="var(--color-entrada)" fillOpacity={0.08} />
      <path d={area("out")} fill="var(--color-saida)" fillOpacity={0.08} />
      <path d={line("in")} fill="none" stroke="var(--color-entrada)" strokeWidth={1.5} />
      <path d={line("out")} fill="none" stroke="var(--color-saida)" strokeWidth={1.5} />
      {flow.map((f, i) => (<g key={i}><circle cx={pad + i * stepX} cy={y(f.in)} r={2} fill="var(--color-entrada)" /><circle cx={pad + i * stepX} cy={y(f.out)} r={2} fill="var(--color-saida)" /></g>))}
    </svg>
  );
}
```
