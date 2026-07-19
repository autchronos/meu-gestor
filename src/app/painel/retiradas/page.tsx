import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { mediaSemanal, restanteProLabore } from "@/lib/caixa/prolabore";
import { formatarBRL } from "@/lib/formato";
import { FormLimite } from "@/app/painel/retiradas/FormLimite";
import { FormRetirada } from "@/app/painel/retiradas/FormRetirada";

export default async function Retiradas() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  if (!negocio.usa_carteiras) redirect("/painel");
  const supabase = criarClienteServidor();

  const { data: resumo } = await supabase.rpc("resumo_dashboard", { p_negocio_id: negocio.id });
  const retiradoMes = Number(resumo?.retirado_mes ?? 0);
  const limite = Number(resumo?.limite_prolabore ?? 0);

  const { data: retiradas } = await supabase
    .from("lancamentos")
    .select("id, descricao, valor, data")
    .eq("negocio_id", negocio.id).eq("carteira", "empresa").eq("eh_retirada", true)
    .order("data", { ascending: false }).limit(50);
  const lista = (retiradas ?? []).map((r) => ({ ...r, valor: Number(r.valor) }));

  const media = mediaSemanal(lista.map((r) => ({ data: r.data, valor: r.valor })), hojeSP());
  const { restante, excedente } = restanteProLabore(limite, retiradoMes);
  const pct = limite > 0 ? Math.min(100, Math.round((retiradoMes / limite) * 100)) : 0;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl text-marca">Retiradas (pró-labore)</h1>

      <div className="border border-borda bg-superficie p-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-texto-suave">Retirado no mês</p>
        <p className="font-serif text-2xl tabular-nums text-saida">{formatarBRL(retiradoMes)}</p>
        {limite > 0 ? (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden bg-borda">
              <div className={`h-full ${excedente > 0 ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-texto-suave">
              {excedente > 0
                ? <>Você passou <span className="font-semibold tabular-nums text-saida">{formatarBRL(excedente)}</span> do limite de {formatarBRL(limite)}.</>
                : <>Restam <span className="font-semibold tabular-nums text-entrada">{formatarBRL(restante)}</span> de {formatarBRL(limite)} este mês.</>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-texto-suave">Defina um limite de pró-labore abaixo.</p>
        )}
        <p className="mt-2 text-sm text-texto-suave">Média semanal: <span className="tabular-nums">{formatarBRL(media)}</span></p>
      </div>

      <FormLimite limiteAtual={limite} />
      <FormRetirada />

      <div className="border border-borda bg-superficie">
        <p className="border-b border-borda px-5 py-3 text-sm font-semibold uppercase tracking-wider text-marca">Histórico</p>
        <ul>
          {lista.map((r, idx) => (
            <li key={r.id} className={`flex justify-between px-5 py-3 text-sm ${idx !== lista.length - 1 ? "border-b border-borda" : ""}`}>
              <span className="text-marca">
                {r.descricao}
                <span className="text-xs text-texto-suave"> · {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
              </span>
              <span className="tabular-nums text-saida">-{formatarBRL(r.valor)}</span>
            </li>
          ))}
          {lista.length === 0 && <li className="px-5 py-8 text-center text-sm text-texto-suave">Nenhuma retirada ainda.</li>}
        </ul>
      </div>
    </section>
  );
}
