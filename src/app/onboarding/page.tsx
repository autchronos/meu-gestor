import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Wizard } from "@/app/onboarding/Wizard";

export default async function Onboarding() {
  const supabase = criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Se já tem negócio, não refaz o onboarding.
  const { data: vinculo } = await supabase
    .from("negocio_usuarios")
    .select("negocio_id")
    .limit(1)
    .maybeSingle();
  if (vinculo) redirect("/painel");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold text-marca">Bem-vindo!</h1>
        <p className="mt-1 text-sm text-texto-suave">Vamos configurar seu negócio.</p>
      </div>
      <div className="border border-borda bg-superficie p-6">
        <Wizard />
      </div>
    </main>
  );
}
