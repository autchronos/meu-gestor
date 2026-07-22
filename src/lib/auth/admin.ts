import { criarClienteServidor } from "@/lib/supabase/servidor";

// Admin = e-mail do usuario logado esta em ADMIN_EMAILS (env, separado por virgula).
// Sem tabela de papeis; o service_role so e usado depois desta checagem.
export async function ehAdmin(): Promise<boolean> {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  const lista = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return lista.includes(email);
}
