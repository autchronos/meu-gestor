import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fundo px-4 text-center">
      <p className="font-serif text-5xl text-dourado">404</p>
      <h1 className="font-serif text-2xl text-marca">Página não encontrada</h1>
      <p className="text-sm text-texto-suave">O endereço que você tentou abrir não existe.</p>
      <Link href="/" className="border border-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
        Voltar ao início
      </Link>
    </div>
  );
}
