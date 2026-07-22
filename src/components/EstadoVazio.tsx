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
