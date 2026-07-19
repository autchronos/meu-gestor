import { formatarBRL } from "@/lib/formato";

// Valor grande em destaque (dourado, serifado, tabular). Usado no hero de saldo
// sobre a faixa navy — dourado sobre navy tem contraste alto.
export function ValorDestaque({
  valor,
  className = "",
}: {
  valor: number;
  className?: string;
}) {
  return (
    <span className={`font-serif tabular-nums text-dourado ${className}`}>
      {formatarBRL(valor)}
    </span>
  );
}
