import { ValorDestaque } from "@/components/ui/ValorDestaque";
import { formatarBRL } from "@/lib/formato";

export function CardsSaldo({
  disponivel, aReceber, entradasMes, saidasMes, mostrarAReceber,
}: { disponivel: number; aReceber: number; entradasMes: number; saidasMes: number; mostrarAReceber: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-marca px-5 py-6 text-white">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/70">
          <span className="h-2 w-2 bg-dourado" /> Disponível hoje
        </div>
        <p className="mt-2"><ValorDestaque valor={disponivel} className="text-4xl md:text-5xl" /></p>
        {mostrarAReceber && (
          <p className="mt-2 text-xs text-white/70">
            A receber: <span className="tabular-nums">{formatarBRL(aReceber)}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metrica label="Entradas do mês" valor={entradasMes} cor="text-entrada" />
        <Metrica label="Saídas do mês" valor={saidasMes} cor="text-saida" />
      </div>
    </div>
  );
}

function Metrica({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="border border-borda bg-superficie p-4">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 ${cor === "text-entrada" ? "bg-entrada" : "bg-saida"}`} />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${cor}`}>{formatarBRL(valor)}</p>
    </div>
  );
}
