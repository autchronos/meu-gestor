"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavInferior({ usaCarteiras }: { usaCarteiras: boolean }) {
  const path = usePathname();
  const itens = [
    { href: "/painel", rotulo: "Início" },
    { href: "/painel/lancamentos", rotulo: "Lançamentos" },
    ...(usaCarteiras ? [{ href: "/painel/retiradas", rotulo: "Retiradas" }] : []),
    { href: "/painel/categorias", rotulo: "Categorias" },
    { href: "/painel/configuracoes", rotulo: "Config" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-superficie">
      <div className="mx-auto flex max-w-2xl">
        {itens.map((i) => {
          const ativo = i.href === "/painel"
            ? path === "/painel"
            : path === i.href || path.startsWith(`${i.href}/`);
          return (
            <Link key={i.href} href={i.href} aria-current={ativo ? "page" : undefined}
              className={`flex-1 py-3 text-center text-xs ${ativo ? "font-semibold text-marca" : "text-texto-suave"}`}>
              {i.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
