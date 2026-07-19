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
