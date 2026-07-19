import Link from "next/link";

export default function Entrar() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-serif text-2xl font-bold text-marca">Entrar / Cadastrar</h1>
      <p className="text-texto-suave">Área de acesso em breve — chega na Fase 2.</p>
      <Link href="/" className="text-marca underline">
        Voltar para o início
      </Link>
    </main>
  );
}
