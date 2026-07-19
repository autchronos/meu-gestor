import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { NavInferior } from "@/components/painel/NavInferior";
import { sair } from "@/app/painel/acoes";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const negocio = await negocioAtual();
  if (!negocio) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-20 pt-6">
      <header className="mb-4 flex items-center justify-between border-b border-borda pb-3">
        <p className="font-serif text-lg font-bold text-marca">{negocio.nome}</p>
        <form action={sair}>
          <button type="submit" className="text-sm text-texto-suave hover:text-texto">Sair</button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
      <NavInferior />
    </div>
  );
}
