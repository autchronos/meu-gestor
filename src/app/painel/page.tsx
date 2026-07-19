import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { serieEntradaSaida } from "@/lib/caixa/fluxoES";
import { CardsSaldo } from "@/components/painel/CardsSaldo";
import { GraficoFluxo } from "@/components/painel/GraficoFluxo";
import { UltimosLancamentos } from "@/components/painel/UltimosLancamentos";
import { CardProLabore } from "@/components/painel/CardProLabore";

export default async function Painel() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();

  const { data: resumo } = await supabase.rpc("resumo_dashboard", { p_negocio_id: negocio.id });
  const r = resumo ?? { disponivel: 0, a_receber: 0, entradas_mes: 0, saidas_mes: 0, retirado_mes: 0, limite_prolabore: 0 };

  const hojeStr = hojeSP();
  const [y, m, d] = hojeStr.split("-").map(Number);
  const de = new Date(Date.UTC(y, m - 1, d - 29)).toISOString().slice(0, 10);
  const hoje = new Date(hojeStr + "T12:00:00");

  const { data: lancs30 } = await supabase
    .from("lancamentos").select("data, tipo, valor")
    .eq("negocio_id", negocio.id).eq("carteira", "empresa").gte("data", de).order("data");
  const { data: ultimos } = await supabase
    .from("lancamentos").select("id, descricao, valor, tipo, data")
    .eq("negocio_id", negocio.id)
    .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(10);

  const serie = serieEntradaSaida(
    (lancs30 ?? []).map((l) => ({ data: l.data, tipo: l.tipo, valor: Number(l.valor) })),
    hoje,
  );
  const liquido = Number(r.entradas_mes) - Number(r.saidas_mes);

  return (
    <section className="flex flex-col gap-4">
      <CardsSaldo
        disponivel={Number(r.disponivel)}
        aReceber={Number(r.a_receber)}
        entradasMes={Number(r.entradas_mes)}
        saidasMes={Number(r.saidas_mes)}
        mostrarAReceber={negocio.usa_fiado}
      />
      {negocio.usa_carteiras && Number(r.limite_prolabore) > 0 && (
        <CardProLabore retirado={Number(r.retirado_mes)} limite={Number(r.limite_prolabore)} />
      )}
      <GraficoFluxo serie={serie} liquido={liquido} />
      <UltimosLancamentos itens={(ultimos ?? []).map((l) => ({ ...l, valor: Number(l.valor) }))} />
    </section>
  );
}
