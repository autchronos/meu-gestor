import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { FormCapacidades } from "@/app/painel/configuracoes/FormCapacidades";

export default async function Configuracoes() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const flags = {
    usa_estoque: negocio.usa_estoque, usa_fiado: negocio.usa_fiado,
    usa_locacao: negocio.usa_locacao, usa_carteiras: negocio.usa_carteiras,
    usa_metas: negocio.usa_metas,
  };
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-serif text-xl font-bold text-marca">Configurações</h1>
      <p className="text-sm text-texto-suave">Ligue ou desligue os módulos do seu negócio.</p>
      <FormCapacidades inicial={flags} />
    </section>
  );
}
