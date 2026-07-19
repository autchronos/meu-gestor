import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { sair } from "@/app/painel/acoes";

export default async function Painel() {
  const supabase = criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nome")
    .limit(1)
    .maybeSingle();

  // Sem negócio ainda -> onboarding.
  if (!negocio) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between border-b border-borda pb-4">
        <div>
          <p className="font-serif text-xl font-bold text-marca">{negocio.nome}</p>
          <p className="text-sm text-texto-suave">{user.email}</p>
        </div>
        <form action={sair}>
          <button type="submit" className="rounded-md border border-borda px-3 py-1.5 text-sm text-texto-suave hover:text-texto">
            Sair
          </button>
        </form>
      </header>
      <div className="rounded-xl border border-borda bg-superficie p-6">
        <p className="text-texto">
          Conta e negócio configurados. O painel financeiro completo chega na Fase 3.
        </p>
      </div>
    </main>
  );
}
