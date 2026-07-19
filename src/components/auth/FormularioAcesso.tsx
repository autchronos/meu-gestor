"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import { validarEmail, validarSenha } from "@/lib/auth/validaLogin";

type Modo = "entrar" | "cadastrar";

export function FormularioAcesso() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    if (!validarEmail(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    const v = validarSenha(senha);
    if (!v.ok) {
      setErro(v.erro!);
      return;
    }

    setCarregando(true);
    const supabase = criarClienteBrowser();

    if (modo === "cadastrar") {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setCarregando(false);
      if (error) {
        // Mensagem genérica de propósito: não confirmar se o e-mail já existe
        // (evita enumeração de contas), igual ao caminho de login.
        setErro("Não foi possível criar a conta. Se você já tem cadastro, use Entrar.");
        return;
      }
      setAviso("Enviamos um e-mail de confirmação. Confirme para entrar.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.push("/painel");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex border border-borda p-1 text-sm">
        <button
          type="button"
          onClick={() => setModo("entrar")}
          className={`flex-1 px-3 py-1.5 ${modo === "entrar" ? "bg-marca text-white" : "text-texto-suave"}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setModo("cadastrar")}
          className={`flex-1 px-3 py-1.5 ${modo === "cadastrar" ? "bg-marca text-white" : "text-texto-suave"}`}
        >
          Criar conta
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-borda bg-superficie px-3 py-2 text-texto"
          autoComplete="email"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={6}
          className="border border-borda bg-superficie px-3 py-2 text-texto"
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
        />
      </label>

      {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-entrada">{aviso}</p>}

      <button
        type="submit"
        disabled={carregando}
        className="bg-marca px-4 py-2 font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>
    </form>
  );
}
