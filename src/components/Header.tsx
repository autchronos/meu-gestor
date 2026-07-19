import Image from "next/image";
import Link from "next/link";
import { ToggleTema } from "@/components/ToggleTema";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-fundo">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-icone.png" alt="Autchronos" width={36} height={36} priority />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-lg font-bold text-marca">Autchronos</span>
            <span className="text-[11px] text-texto-suave">Meu Gestor Financeiro</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-texto-suave md:flex">
          <a href="#recursos" className="hover:text-texto">Recursos</a>
          <a href="#como-funciona" className="hover:text-texto">Como funciona</a>
        </nav>
        <div className="flex items-center gap-2">
          <ToggleTema />
          <Link
            href="/entrar"
            className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          >
            Entrar / Cadastrar
          </Link>
        </div>
      </div>
    </header>
  );
}
