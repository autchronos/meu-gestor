import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormCapacidades } from "@/app/painel/configuracoes/FormCapacidades";
import { FormNomeNegocio } from "@/app/painel/configuracoes/FormNomeNegocio";
import { ConectarWhatsApp } from "@/app/painel/configuracoes/ConectarWhatsApp";

export default async function Configuracoes() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const { data: telefones } = await supabase
    .from("negocio_telefones").select("telefone, verificado").eq("negocio_id", negocio.id);
  const numeroSugerido = telefones?.find((t) => !t.verificado)?.telefone ?? null;
  const conectados = (telefones ?? []).filter((t) => t.verificado).map((t) => t.telefone);

  const flags = {
    usa_estoque: negocio.usa_estoque, usa_fiado: negocio.usa_fiado,
    usa_locacao: negocio.usa_locacao, usa_carteiras: negocio.usa_carteiras,
    usa_metas: negocio.usa_metas,
  };
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Configurações</h1>
      <FormNomeNegocio nomeAtual={negocio.nome} />
      <ConectarWhatsApp numeroSugerido={numeroSugerido} conectados={conectados} />
      <p className="text-sm text-texto-suave">Ligue ou desligue os módulos do seu negócio.</p>
      <FormCapacidades inicial={flags} />
    </section>
  );
}
