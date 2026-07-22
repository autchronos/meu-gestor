import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { destinoSeguro } from "@/lib/auth/destino";

function voltarComErro(origin: string, mensagem: string) {
  return NextResponse.redirect(
    `${origin}/entrar?erro=${encodeURIComponent(mensagem)}`,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const erroOAuth =
    searchParams.get("error_description") ?? searchParams.get("error");

  // Ex.: usuário cancelou o consentimento do Google.
  if (erroOAuth) {
    return voltarComErro(origin, "Não foi possível entrar. Tente novamente.");
  }

  if (code) {
    const supabase = criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Destino validado (recuperação → /nova-senha, confirmação → /confirmado);
      // sem next, cai no /painel (que decide se manda para o onboarding).
      const next = destinoSeguro(searchParams.get("next"));
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return voltarComErro(origin, "Link inválido ou expirado. Faça login novamente.");
}
