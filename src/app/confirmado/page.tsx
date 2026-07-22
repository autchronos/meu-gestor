import Link from "next/link";

export const metadata = { title: "Conta confirmada — Autchronos" };

export default function Confirmado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10 text-center">
      <div>
        <Link href="/" className="font-serif text-2xl font-bold text-marca">Autchronos</Link>
        <p className="mt-1 text-sm text-texto-suave">Meu Gestor Financeiro</p>
      </div>
      <div className="border border-borda bg-superficie p-6">
        <p className="font-serif text-3xl text-dourado">✓</p>
        <h1 className="mt-2 font-serif text-xl text-marca">Conta confirmada!</h1>
        <p className="mt-2 text-sm text-texto-suave">Seu e-mail foi confirmado. Bem-vindo ao Autchronos — vamos configurar seu negócio.</p>
        <Link href="/painel" className="mt-4 inline-block bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90">
          Continuar
        </Link>
      </div>
    </main>
  );
}
