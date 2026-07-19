import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { Sidebar } from "@/components/nav/Sidebar";
import { DrawerNav } from "@/components/nav/DrawerNav";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const negocio = await negocioAtual();
  if (!negocio) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar usaCarteiras={negocio.usa_carteiras} nome={negocio.nome} />
      <DrawerNav usaCarteiras={negocio.usa_carteiras} nome={negocio.nome} />
      <div className="lg:pl-16">
        <main className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
