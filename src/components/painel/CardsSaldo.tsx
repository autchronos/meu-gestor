import { formatarBRL } from "@/lib/formato";

export function CardsSaldo({
  entradasMes,
  saidasMes,
}: {
  entradasMes: number;
  saidasMes: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Metrica label="Entradas do mês" valor={entradasMes} cor="entrada" />
      <Metrica label="Saídas do mês" valor={saidasMes} cor="saida" />
    </div>
  );
}

function Metrica({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: number;
  cor: "entrada" | "saida";
}) {
  const chip = cor === "entrada" ? "bg-entrada" : "bg-saida";
  const texto = cor === "entrada" ? "text-entrada" : "text-saida";
  return (
    <div className="border border-borda bg-superficie p-4">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 ${chip}`} />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">{label}</span>
      </div>
      <p className={`mt-2 font-serif text-2xl font-semibold tabular-nums ${texto}`}>{formatarBRL(valor)}</p>
    </div>
  );
}
