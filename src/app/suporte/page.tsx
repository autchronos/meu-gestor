import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Suporte — Autchronos" };

export default function Suporte() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-serif text-3xl text-marca">Precisa de ajuda?</h1>
        <p className="mt-3 text-sm text-texto-suave">
          Estamos por perto. Mande sua dúvida, problema ou ideia de melhoria — a gente lê tudo.
        </p>
        <div className="mt-6 border border-marca bg-superficie p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-texto-suave">Fale com a gente</p>
          <a href="mailto:autchronos@gmail.com" className="mt-1 block font-serif text-xl text-dourado hover:underline">
            autchronos@gmail.com
          </a>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <p className="text-texto">Já tem conta? Entre e mande sua sugestão direto pelo app — fica registrada e você acompanha.</p>
          <Link href="/entrar" className="self-start border border-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-marca transition-colors hover:bg-marca hover:text-white">
            Entrar
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
