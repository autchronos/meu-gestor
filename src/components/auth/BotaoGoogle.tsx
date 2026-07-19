"use client";
import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/cliente";

export function BotaoGoogle() {
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrarComGoogle() {
    setErro(null);
    setCarregando(true);
    const supabase = criarClienteBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Em sucesso o navegador já está sendo redirecionado ao Google; mantemos
    // "carregando". Só voltamos ao estado normal se deu erro.
    if (error) {
      setCarregando(false);
      setErro("Não foi possível iniciar o login com Google. Tente novamente.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={entrarComGoogle}
        disabled={carregando}
        className="w-full border border-borda bg-superficie px-4 py-2 font-medium text-texto transition-colors hover:bg-fundo disabled:opacity-60"
      >
        {carregando ? "Redirecionando..." : "Entrar com Google"}
      </button>
      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
    </div>
  );
}
