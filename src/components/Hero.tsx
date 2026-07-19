import Link from "next/link";
import { formatarBRL } from "@/lib/formato";
import { BotaoInstalar } from "@/components/BotaoInstalar";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
      <div>
        <h1 className="font-serif text-4xl font-bold leading-tight text-marca md:text-5xl">
          Autchronos
        </h1>
        <p className="mt-1 font-serif text-xl text-texto-suave">
          Meu Gestor Financeiro
        </p>
        <p className="mt-6 text-lg text-texto">
          Controle o dinheiro do seu negócio com a seriedade de um banco e a
          simplicidade de uma conversa no WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/entrar"
            className="rounded-md bg-marca px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Entrar / Cadastrar
          </Link>
          <div className="md:hidden">
            <BotaoInstalar />
          </div>
        </div>
      </div>
      <MockupApp />
    </section>
  );
}

function MockupApp() {
  return (
    <div className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm">
      <div className="bg-marca p-5 text-white">
        <p className="text-sm opacity-80">Saldo em caixa</p>
        <p className="font-serif text-3xl font-bold text-dourado">
          {formatarBRL(4235.9)}
        </p>
      </div>
      <ul className="divide-y divide-borda p-5 text-sm">
        <li className="flex justify-between py-2">
          <span>Venda de açaí</span>
          <span className="text-entrada">+{formatarBRL(45)}</span>
        </li>
        <li className="flex justify-between py-2">
          <span>Fornecedor</span>
          <span className="text-saida">-{formatarBRL(200)}</span>
        </li>
        <li className="flex justify-between py-2">
          <span>Aluguel recebido</span>
          <span className="text-entrada">+{formatarBRL(800)}</span>
        </li>
      </ul>
    </div>
  );
}
