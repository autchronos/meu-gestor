const RECURSOS = [
  {
    titulo: "Separe empresa e pessoal",
    texto:
      "Cada lançamento numa carteira. Retiradas de pró-labore com limite e alerta — pare de misturar seu dinheiro com o do negócio.",
  },
  {
    titulo: "Saldo real, não aparente",
    texto:
      "Saiba o que já caiu (“Disponível hoje”) e o que ainda vai cair (“A receber”), com fiado e taxas de cartão já descontadas.",
  },
  {
    titulo: "Lançamentos pelo WhatsApp",
    texto:
      "Mande “vendi 3 açaí 45” e o app registra a entrada sozinho, com baixa no estoque.",
  },
  {
    titulo: "Estoque por nicho",
    texto:
      "Produtos, ingredientes ou itens de locação — o controle se adapta ao seu negócio.",
  },
];

export function SecaoRecursos() {
  return (
    <section id="recursos" className="border-t border-borda bg-superficie">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-marca">Recursos</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {RECURSOS.map((r) => (
            <div key={r.titulo} className="rounded-lg border border-borda p-6">
              <h3 className="text-lg font-semibold text-texto">{r.titulo}</h3>
              <p className="mt-2 text-texto-suave">{r.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
