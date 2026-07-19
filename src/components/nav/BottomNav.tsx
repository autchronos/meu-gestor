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
