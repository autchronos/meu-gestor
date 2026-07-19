import Link from "next/link";
import { FormularioAcesso } from "@/components/auth/FormularioAcesso";
import { BotaoGoogle } from "@/components/auth/BotaoGoogle";

export default function Entrar({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  const erro = searchParams?.erro;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Link href="/" className="font-serif text-2xl font-bold text-marca">
          Autchronos
        </Link>
        <p className="mt-1 text-sm text-texto-suave">Meu Gestor Financeiro</p>
      </div>

      <div className="border border-borda bg-superficie p-6">
        {erro && (
          <p
            role="alert"
            className="mb-4 border border-borda px-3 py-2 text-sm text-saida"
          >
            {erro}
          </p>
        )}
        <FormularioAcesso />
        <div className="my-4 flex items-center gap-3 text-xs text-texto-suave">
          <span aria-hidden className="h-px flex-1 bg-borda" />ou
          <span aria-hidden className="h-px flex-1 bg-borda" />
        </div>
        <BotaoGoogle />
      </div>

      <Link href="/" className="text-center text-sm text-marca underline">
        Voltar para o início
      </Link>
    </main>
  );
}
