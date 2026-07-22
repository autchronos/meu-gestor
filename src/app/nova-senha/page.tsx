"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import { validarSenha } from "@/lib/auth/validaLogin";

export default function NovaSenha() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const supabase = criarClienteBrowser();
    supabase.auth.getUser().then(({ data }) => setTemSessao(!!data.user));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = validarSenha(senha);
    if (!v.ok) { setErro(v.erro!); return; }
    if (senha !== confirma) { setErro("As senhas não conferem."); return; }
    setCarregando(true);
    const supabase = criarClienteBrowser();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) { setErro("Não foi possível redefinir. Peça um novo link."); return; }
    setAviso("Senha redefinida! Redirecionando…");
    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Link href="/" className="font-serif text-2xl font-bold text-marca">Autchronos</Link>
        <p className="mt-1 text-sm text-texto-suave">Meu Gestor Financeiro</p>
      </div>
      <div className="border border-borda bg-superficie p-6">
        <h1 className="font-serif text-xl text-marca">Definir nova senha</h1>
        {temSessao === false ? (
          <p className="mt-4 text-sm text-texto-suave">
            Link inválido ou expirado. Peça um novo em <Link href="/entrar" className="text-marca underline">Entrar → Esqueci minha senha</Link>.
          </p>
        ) : (
          <form onSubmit={salvar} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">Nova senha
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} autoComplete="new-password" className="border border-borda bg-superficie px-3 py-2 text-texto" />
            </label>
            <label className="flex flex-col gap-1 text-sm">Confirmar senha
              <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} minLength={6} autoComplete="new-password" className="border border-borda bg-superficie px-3 py-2 text-texto" />
            </label>
            {erro && <p role="alert" className="text-sm text-saida">{erro}</p>}
            {aviso && <p role="status" className="text-sm text-entrada">{aviso}</p>}
            <button type="submit" disabled={carregando || temSessao === null}
              className="bg-marca px-4 py-2 font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {carregando ? "Aguarde…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
