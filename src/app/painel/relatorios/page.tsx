import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { hojeSP } from "@/lib/caixa/periodo";
import { intervaloRelatorio, mesAnterior, margemPct, variacaoPct, progressoMeta, type Intervalo } from "@/lib/relatorio/calculos";
import { formatarBRL } from "@/lib/formato";
import { FormMetas } from "@/app/painel/relatorios/FormMetas";

const PERIODOS = [
  { v: "hoje", r: "Hoje" }, { v: "semana", r: "Semana" }, { v: "mes", r: "Mês" }, { v: "tudo", r: "Tudo" },
];

export default async function Relatorios({ searchParams }: { searchParams: { periodo?: string } }) {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const hoje = hojeSP();
  const periodo = searchParams.periodo ?? "mes";

  const sel = intervaloRelatorio(periodo, hoje);
  const mesAt = intervaloRelatorio("mes", hoje);
  const mesAnt = mesAnterior(hoje);

  const rpc = (i: Intervalo) => supabase.rpc("relatorio", { p_negocio_id: negocio.id, p_de: i.de, p_ate: i.ate });
  const [selR, mesR, antR, metasR, receberR] = await Promise.all([
    rpc(sel), rpc(mesAt), rpc(mesAnt),
    supabase.from("metas").select("meta_faturamento, meta_lucro").eq("negocio_id", negocio.id).maybeSingle(),
    supabase.from("receber").select("valor").eq("negocio_id", negocio.id).eq("pago", false),
  ]);

  const houveErro = Boolean(selR.error || mesR.error || antR.error || metasR.error || receberR.error);

  const dados = (d: unknown) => {
    const o = (d ?? {}) as { faturamento?: number; custos?: number };
    return { faturamento: Number(o.faturamento ?? 0), custos: Number(o.custos ?? 0) };
  };
  const selD = dados(selR.data), mesD = dados(mesR.data), antD = dados(antR.data);
  const metaFat = Number(metasR.data?.meta_faturamento ?? 0);
  const metaLuc = Number(metasR.data?.meta_lucro ?? 0);
  const aReceber = (receberR.data ?? []).reduce((a, x) => a + Number(x.valor), 0);

  const lucroMes = mesD.faturamento - mesD.custos;
  const lucroSel = selD.faturamento - selD.custos;
  const varFat = variacaoPct(mesD.faturamento, antD.faturamento);
  const varLuc = variacaoPct(lucroMes, antD.faturamento - antD.custos);

  return (
    <>
      <div className="bg-marca text-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="font-serif text-2xl">Relatório</h1>
          <p className="mt-1 text-xs text-white/60">Lucro = entradas − despesas do período (não inclui custo de estoque).</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {houveErro && (
          <p role="alert" className="border border-saida bg-superficie px-4 py-3 text-sm text-saida">
            Não foi possível carregar os números agora. Tente atualizar a página em instantes.
          </p>
        )}
        <div className="border border-borda bg-superficie p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-marca">Metas do mês</p>
          <Meta label="Faturamento" atual={mesD.faturamento} meta={metaFat} variacao={varFat} />
          <Meta label="Lucro" atual={lucroMes} meta={metaLuc} variacao={varLuc} />
        </div>

        <form method="get" className="flex border border-borda text-[11px] uppercase tracking-wider">
          {PERIODOS.map((p) => (
            <button key={p.v} name="periodo" value={p.v} type="submit"
              className={`flex-1 px-2 py-2 transition-colors ${periodo === p.v ? "bg-marca text-white" : "text-texto-suave hover:text-texto"}`}>
              {p.r}
            </button>
          ))}
        </form>

        <div className="grid grid-cols-2 gap-3">
          <Card label="Faturamento" valor={formatarBRL(selD.faturamento)} cor="text-entrada" />
          <Card label="Custos" valor={formatarBRL(selD.custos)} cor="text-saida" />
          <Card label="Lucro" valor={formatarBRL(lucroSel)} cor={lucroSel >= 0 ? "text-entrada" : "text-saida"} />
          <Card label="Margem" valor={`${margemPct(selD.faturamento, selD.custos)}%`} cor="text-texto" />
        </div>

        <div className="border border-borda bg-superficie p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">A receber</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-texto">{formatarBRL(aReceber)}</p>
        </div>

        <a href={`/painel/relatorios/csv?de=${sel.de}&ate=${sel.ate}`}
          className="border border-marca px-4 py-2 text-center text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
          Exportar CSV
        </a>

        <FormMetas faturamentoAtual={metaFat} lucroAtual={metaLuc} />
      </div>
    </>
  );
}

function Meta({ label, atual, meta, variacao }: { label: string; atual: number; meta: number; variacao: number | null }) {
  const pct = progressoMeta(atual, meta);
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-texto">{label}</span>
        <span className="tabular-nums text-texto-suave">{formatarBRL(atual)} / {formatarBRL(meta)} <span className="text-marca">({pct}%)</span></span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden bg-borda"><div className="h-full bg-dourado" style={{ width: `${pct}%` }} /></div>
      {variacao !== null && (
        <p className="mt-1 text-xs text-texto-suave">vs. mês passado: <span className={variacao >= 0 ? "text-entrada" : "text-saida"}>{variacao >= 0 ? "↑" : "↓"} {Math.abs(variacao)}%</span></p>
      )}
    </div>
  );
}

function Card({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="border border-borda bg-superficie p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-texto-suave">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}
