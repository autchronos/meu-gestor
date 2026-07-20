"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
          <Image src="/logo-icone.png" alt="Autchronos" width={24} height={24} priority />
          <span className="font-serif text-lg">Autchronos</span>
        </div>
        <form action={sair}><button type="submit" className="text-xs uppercase tracking-wider text-white/60">Sair</button></form>
      </header>
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-marca text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Image src="/logo-icone.png" alt="Autchronos" width={28} height={28} />
                <span>
                  <span className="block font-serif text-lg leading-tight">Autchronos</span>
                  <span className="block text-[10px] uppercase tracking-wider text-white/60">Meu Gestor Financeiro</span>
                </span>
              </div>
              <button aria-label="Fechar" onClick={() => setAberto(false)}><X className="h-5 w-5" /></button>
            </div>
            <p className="px-5 pt-3 text-[11px] uppercase tracking-[0.16em] text-white/50">{nome}</p>
            <nav className="mt-2 flex-1">
              {itens.map((i) => {
                const ativo = ehAtivo(path, i.href);
                return (
                  <Link key={i.href} href={i.href} onClick={() => setAberto(false)}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-3 px-5 py-3 text-sm uppercase tracking-wider transition-colors ${ativo ? "text-dourado" : "text-white/70 hover:text-white"}`}>
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
