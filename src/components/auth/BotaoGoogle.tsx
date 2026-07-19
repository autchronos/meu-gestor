"use client";
import { criarClienteBrowser } from "@/lib/supabase/cliente";

export function BotaoGoogle() {
  async function entrarComGoogle() {
    const supabase = criarClienteBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      type="button"
      onClick={entrarComGoogle}
      className="w-full rounded-md border border-borda bg-superficie px-4 py-2 font-medium text-texto transition-colors hover:bg-fundo"
    >
      Entrar com Google
    </button>
  );
}
