import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ScrollText } from "lucide-react";
import { formatarBRL } from "@/lib/formato";

interface Item { id: string; descricao: string; valor: number; tipo: "entrada" | "saida"; data: string }

export function UltimosLancamentos({ itens }: { itens: Item[] }) {
  return (
    <div className="border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-dourado" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Últimos lançamentos</h2>
        </div>
        <Link href="/painel/lancamentos" className="flex items-center gap-1 text-xs font-medium text-marca hover:underline">
          Ver extrato <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul>
        {itens.map((l, idx) => (
          <li key={l.id} className={`flex items-center gap-3 px-5 py-3 ${idx !== itens.length - 1 ? "border-b border-borda" : ""}`}>
            <div className={`grid h-8 w-8 shrink-0 place-items-center border ${l.tipo === "entrada" ? "border-entrada text-entrada" : "border-saida text-saida"}`}>
              {l.tipo === "entrada" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-marca">{l.descricao}</p>
              <p className="truncate text-xs text-texto-suave">{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${l.tipo === "entrada" ? "text-entrada" : "text-saida"}`}>
              {l.tipo === "entrada" ? "+" : "−"}{formatarBRL(l.valor)}
            </span>
          </li>
        ))}
        {itens.length === 0 && <li className="px-5 py-8 text-center text-sm text-texto-suave">Nada ainda. Faça seu primeiro lançamento.</li>}
      </ul>
    </div>
  );
}
