"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Plus } from "lucide-react";
import { itensNav, ehAtivo } from "@/lib/nav/itens";
import { sair } from "@/app/painel/acoes";

// Colapsada por padrão (só ícones, w-16); expande no hover (w-60). Fica fixa e
// sobre o conteúdo, então o conteúdo mantém o padding da largura colapsada.
export function Sidebar({ usaCarteiras, nome }: { usaCarteiras: boolean; nome: string }) {
  const path = usePathname();
  const itens = itensNav({ usa_carteiras: usaCarteiras });
  return (
    <aside className="group fixed inset-y-0 left-0 z-30 hidden w-16 flex-col overflow-hidden border-r border-borda bg-marca text-white transition-[width] duration-200 ease-out hover:w-60 lg:flex">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Landmark className="h-6 w-6 shrink-0 text-dourado" />
        <span className="whitespace-nowrap font-serif text-xl">Autchronos</span>
      </div>
      <p className="whitespace-nowrap px-5 pt-4 text-[11px] uppercase tracking-[0.16em] text-white/50">{nome}</p>
      <Link href="/painel/lancamentos?novo=1" title="Novo lançamento"
        className="mx-3 mt-3 flex items-center gap-3 whitespace-nowrap bg-dourado px-3 py-2 text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-dourado-suave">
        <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} /> Novo lançamento
      </Link>
      <nav className="mt-5 flex-1">
        {itens.map((i) => {
          const ativo = ehAtivo(path, i.href);
          return (
            <Link key={i.href} href={i.href} title={i.rotulo} aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-3 whitespace-nowrap px-5 py-3 text-sm uppercase tracking-wider transition-colors ${ativo ? "border-l-2 border-dourado text-dourado" : "text-white/70 hover:text-white"}`}>
              <i.Icone className="h-5 w-5 shrink-0" /> {i.rotulo}
            </Link>
          );
        })}
      </nav>
      <form action={sair} className="border-t border-white/10 px-5 py-4">
        <button type="submit" title="Sair" className="whitespace-nowrap text-xs uppercase tracking-wider text-white/60 transition-colors hover:text-white">Sair</button>
      </form>
    </aside>
  );
}
