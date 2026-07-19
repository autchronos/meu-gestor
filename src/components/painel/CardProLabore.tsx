import { formatarBRL } from "@/lib/formato";

export function CardProLabore({ retirado, limite }: { retirado: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((retirado / limite) * 100)) : 0;
  const passou = retirado > limite;
  return (
    <div className="rounded-xl border border-borda bg-superficie p-4">
      <p className="text-sm text-texto-suave">Pró-labore este mês</p>
      <p className="text-texto">
        Você já retirou <span className="font-semibold text-saida">{formatarBRL(retirado)}</span> de {formatarBRL(limite)}.
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-borda">
        <div className={`h-full ${passou ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
      </div>
      {passou && <p className="mt-1 text-xs text-saida">Você ultrapassou o limite de pró-labore.</p>}
    </div>
  );
}
