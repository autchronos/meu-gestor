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
      <h1 className="font-serif text-xl font-bold text-marca">Retiradas (pró-labore)</h1>

      <div className="rounded-xl border border-borda bg-superficie p-4">
        <p className="text-sm text-texto-suave">Retirado no mês</p>
        <p className="font-serif text-2xl font-bold text-saida">{formatarBRL(retiradoMes)}</p>
        {limite > 0 ? (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-borda">
              <div className={`h-full ${excedente > 0 ? "bg-saida" : "bg-dourado"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-texto-suave">
              {excedente > 0
                ? <>Você passou <span className="font-semibold text-saida">{formatarBRL(excedente)}</span> do limite de {formatarBRL(limite)}.</>
                : <>Restam <span className="font-semibold text-entrada">{formatarBRL(restante)}</span> de {formatarBRL(limite)} este mês.</>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-texto-suave">Defina um limite de pró-labore abaixo.</p>
        )}
        <p className="mt-2 text-sm text-texto-suave">Média semanal: {formatarBRL(media)}</p>
      </div>

      <FormLimite limiteAtual={limite} />
      <FormRetirada />

      <div className="rounded-xl border border-borda bg-superficie">
        <p className="border-b border-borda px-4 py-2 text-sm font-semibold text-texto">Histórico</p>
        <ul className="divide-y divide-borda">
          {lista.map((r) => (
            <li key={r.id} className="flex justify-between px-4 py-2 text-sm">
              <span className="text-texto">
                {r.descricao}
                <span className="text-xs text-texto-suave"> · {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
              </span>
              <span className="text-saida">-{formatarBRL(r.valor)}</span>
            </li>
          ))}
          {lista.length === 0 && <li className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma retirada ainda.</li>}
        </ul>
      </div>
    </section>
  );
}
