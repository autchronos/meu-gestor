import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-borda">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-texto-suave">
        <p className="font-serif font-semibold text-marca">Autchronos — Meu Gestor Financeiro</p>
        <p className="mt-1">Gestão financeira para micro-empreendedores brasileiros.</p>
        <Link href="/suporte" className="mt-3 inline-block text-marca hover:underline">Suporte</Link>
      </div>
    </footer>
  );
}
