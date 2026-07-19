import Link from "next/link";
import { formatarBRL } from "@/lib/formato";

interface Item { id: string; descricao: string; valor: number; tipo: "entrada" | "saida"; data: string }

export function UltimosLancamentos({ itens }: { itens: Item[] }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-4 py-2">
        <p className="text-sm font-semibold text-texto">Últimos lançamentos</p>
        <Link href="/painel/lancamentos" className="text-xs text-marca">Ver todos</Link>
      </div>
      <ul className="divide-y divide-borda">
        {itens.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="truncate text-texto">{l.descricao}</span>
            <span className={l.tipo === "entrada" ? "text-entrada" : "text-saida"}>
              {l.tipo === "entrada" ? "+" : "-"}{formatarBRL(Number(l.valor))}
            </span>
          </li>
        ))}
        {itens.length === 0 && <li className="px-4 py-6 text-center text-sm text-texto-suave">Nada ainda. Faça seu primeiro lançamento.</li>}
      </ul>
    </div>
  );
}
