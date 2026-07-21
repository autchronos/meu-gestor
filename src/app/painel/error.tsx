"use client";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="font-serif text-2xl text-marca">Algo deu errado</h1>
      <p className="text-sm text-texto-suave">Não foi possível carregar esta tela. Tente de novo em instantes.</p>
      <button type="button" onClick={reset}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90">
        Tentar de novo
      </button>
    </div>
  );
}
