import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

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
      // Autenticado: o /painel decide se manda para o onboarding.
      return NextResponse.redirect(`${origin}/painel`);
    }
  }

  return voltarComErro(origin, "Link inválido ou expirado. Faça login novamente.");
}
