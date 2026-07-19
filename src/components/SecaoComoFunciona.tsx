const PASSOS = [
  { n: 1, titulo: "Crie sua conta", texto: "Cadastre o negócio e escolha o seu nicho em menos de um minuto." },
  { n: 2, titulo: "Conecte o WhatsApp", texto: "Ligue seu número e passe a lançar vendas por mensagem." },
  { n: 3, titulo: "Acompanhe o caixa", texto: "Veja saldo, relatórios e estoque atualizados em tempo real." },
];

export function SecaoComoFunciona() {
  return (
    <section id="como-funciona" className="border-t border-borda">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-marca">Como funciona</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {PASSOS.map((p) => (
            <li key={p.n} className="rounded-lg border border-borda bg-superficie p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marca font-serif text-lg font-bold text-dourado">
                {p.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-texto">{p.titulo}</h3>
              <p className="mt-2 text-texto-suave">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
