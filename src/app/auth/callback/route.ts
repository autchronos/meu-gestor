import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = criarClienteServidor();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Após autenticar, o /painel decide se manda para o onboarding.
  return NextResponse.redirect(`${origin}/painel`);
}
