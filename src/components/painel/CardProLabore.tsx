import Link from "next/link";
import { formatarBRL } from "@/lib/formato";

export function CardProLabore({ retirado, limite }: { retirado: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((retirado / limite) * 100)) : 0;
  const passou = retirado > limite;
  return (
    <Link href="/painel/retiradas" className="block border border-borda bg-superficie p-4 hover:border-dourado">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">Pró-labore este mês</p>
      <p className="mt-1 text-texto">
        Você já retirou <span className="font-semibold tabular-nums text-saida">{formatarBRL(retirado)}</span> de <span className="tabular-nums">{formatarBRL(limite)}</span>.
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden bg-borda">
        <div className={`h-full ${passou ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
      </div>
      {passou && <p className="mt-1 text-xs text-saida">Você ultrapassou o limite de pró-labore.</p>}
    </Link>
  );
}
