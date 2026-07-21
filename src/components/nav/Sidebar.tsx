"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { itensNav, ehAtivo } from "@/lib/nav/itens";
import { sair } from "@/app/painel/acoes";

// Colapsada por padrão (só ícones, w-14); expande no hover (w-60). Os rótulos
// somem por opacidade quando colapsada (nada de palavra vazando) e aparecem no
// hover. Fica fixa e sobre o conteúdo (que mantém o padding da largura colapsada).
export function Sidebar({ usaCarteiras, usaFiado, usaEstoque, usaLocacao, nome }: { usaCarteiras: boolean; usaFiado: boolean; usaEstoque: boolean; usaLocacao: boolean; nome: string }) {
  const path = usePathname();
  const itens = itensNav({ usa_carteiras: usaCarteiras, usa_fiado: usaFiado, usa_estoque: usaEstoque, usa_locacao: usaLocacao });
  const rotulo =
    "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100";
  return (
    <aside className="group fixed inset-y-0 left-0 z-30 hidden w-14 flex-col overflow-hidden border-r border-borda bg-marca text-white transition-[width] duration-200 ease-out hover:w-60 lg:flex">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-4">
        <Image src="/logo-icone.png" alt="Autchronos" width={30} height={30} className="shrink-0" priority />
        <span className={rotulo}>
          <span className="block font-serif text-lg leading-tight">Autchronos</span>
          <span className="block text-[10px] uppercase tracking-wider text-white/60">Meu Gestor Financeiro</span>
        </span>
      </div>
      <p className={`px-4 pt-4 text-[11px] uppercase tracking-[0.16em] text-white/50 ${rotulo}`}>{nome}</p>
      <Link href="/painel/lancamentos?novo=1" title="Novo lançamento"
        className="mx-2 mt-3 flex items-center gap-3 bg-dourado px-3 py-2 text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-dourado-suave">
        <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} /> <span className={rotulo}>Novo lançamento</span>
      </Link>
      <nav className="mt-5 flex-1">
        {itens.map((i) => {
          const ativo = ehAtivo(path, i.href);
          return (
            <Link key={i.href} href={i.href} title={i.rotulo} aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-colors ${ativo ? "border-l-2 border-dourado text-dourado" : "text-white/70 hover:text-white"}`}>
              <i.Icone className="h-5 w-5 shrink-0" /> <span className={rotulo}>{i.rotulo}</span>
            </Link>
          );
        })}
      </nav>
      <form action={sair} className="border-t border-white/10 px-4 py-4">
        <button type="submit" title="Sair" className="flex items-center gap-3 text-xs uppercase tracking-wider text-white/60 transition-colors hover:text-white">
          <LogOut className="h-5 w-5 shrink-0" /> <span className={rotulo}>Sair</span>
        </button>
      </form>
    </aside>
  );
}
