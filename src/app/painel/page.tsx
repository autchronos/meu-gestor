import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { serieEntradaSaida } from "@/lib/caixa/fluxoES";
import { formatarBRL } from "@/lib/formato";
import { deveAlertarSaldo } from "@/lib/relatorio/calculos";
import { HeroSaldo } from "@/components/painel/HeroSaldo";
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

  const { data: metaMin } = await supabase.from("metas").select("saldo_minimo").eq("negocio_id", negocio.id).maybeSingle();
  const alertaSaldo = deveAlertarSaldo(Number(r.disponivel), Number(metaMin?.saldo_minimo ?? 0));

  let acabando = 0;
  if (negocio.usa_estoque) {
    const { data: itensCtrl } = await supabase.from("itens")
      .select("estoque, estoque_minimo").eq("negocio_id", negocio.id)
      .eq("ativo", true).eq("controla_estoque", true).gt("estoque_minimo", 0);
    acabando = (itensCtrl ?? []).filter((i) => Number(i.estoque) <= Number(i.estoque_minimo)).length;
  }

  // Fuso America/Sao_Paulo: o servidor roda em UTC; hojeSP() garante que a janela
  // de 30 dias e o "hoje" da série batam com o dia local do usuário.
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

  return (
    <>
      <HeroSaldo
        disponivel={Number(r.disponivel)}
        aReceber={Number(r.a_receber)}
        mostrarAReceber={negocio.usa_fiado}
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {acabando > 0 && (
          <a href="/painel/itens" role="alert" className="border border-saida bg-superficie px-4 py-3 text-sm text-saida">
            {acabando === 1 ? "1 item está acabando." : `${acabando} itens estão acabando.`} Ver itens →
          </a>
        )}
        {alertaSaldo && (
          <p role="alert" className="border border-saida bg-superficie px-4 py-3 text-sm text-saida">
            Seu caixa está abaixo do saldo mínimo que você definiu ({formatarBRL(Number(metaMin?.saldo_minimo ?? 0))}).
          </p>
        )}
        <CardsSaldo entradasMes={Number(r.entradas_mes)} saidasMes={Number(r.saidas_mes)} />
        {negocio.usa_carteiras && Number(r.limite_prolabore) > 0 && (
          <CardProLabore retirado={Number(r.retirado_mes)} limite={Number(r.limite_prolabore)} />
        )}
        <GraficoFluxo serie={serie} />
        <UltimosLancamentos itens={(ultimos ?? []).map((l) => ({ ...l, valor: Number(l.valor) }))} />
      </div>
    </>
  );
}
