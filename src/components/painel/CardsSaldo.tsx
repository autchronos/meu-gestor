import { formatarBRL } from "@/lib/formato";

export function CardsSaldo({
  disponivel, aReceber, entradasMes, saidasMes, mostrarAReceber,
}: { disponivel: number; aReceber: number; entradasMes: number; saidasMes: number; mostrarAReceber: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-borda bg-marca text-white">
          <div className="p-4">
            <p className="text-sm opacity-80">Disponível hoje</p>
            <p className="font-serif text-3xl font-bold text-dourado">{formatarBRL(disponivel)}</p>
          </div>
        </div>
        {mostrarAReceber && (
          <div className="rounded-xl border border-borda bg-superficie p-4">
            <p className="text-sm text-texto-suave">A receber</p>
            <p className="font-serif text-3xl font-bold text-texto">{formatarBRL(aReceber)}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-borda bg-superficie p-4">
          <p className="text-sm text-texto-suave">Entradas do mês</p>
          <p className="text-xl font-bold text-entrada">{formatarBRL(entradasMes)}</p>
        </div>
        <div className="rounded-xl border border-borda bg-superficie p-4">
          <p className="text-sm text-texto-suave">Saídas do mês</p>
          <p className="text-xl font-bold text-saida">{formatarBRL(saidasMes)}</p>
        </div>
      </div>
    </div>
  );
}
