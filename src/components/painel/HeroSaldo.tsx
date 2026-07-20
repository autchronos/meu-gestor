import { formatarBRL } from "@/lib/formato";

// Faixa navy full-width com o saldo em destaque (modelo do header).
export function HeroSaldo({
  disponivel,
  aReceber,
  mostrarAReceber,
}: {
  disponivel: number;
  aReceber: number;
  mostrarAReceber: boolean;
}) {
  const [inteiro, centavos] = formatarBRL(disponivel).split(",");
  return (
    <div className="bg-marca text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-dourado">
          <span className="h-2 w-2 rounded-full bg-dourado" /> Disponível hoje
        </div>
        <p className="mt-2 font-serif text-4xl font-semibold tabular-nums md:text-5xl">
          {inteiro}
          <span className="text-dourado">,{centavos}</span>
        </p>
        {mostrarAReceber && (
          <p className="mt-2 text-xs text-white/70">
            A receber: <span className="tabular-nums">{formatarBRL(aReceber)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
