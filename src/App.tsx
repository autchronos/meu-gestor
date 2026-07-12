import { BotaoTema } from '@/components/BotaoTema'

function App() {
  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <header className="flex items-center justify-between border-b border-marca/15 px-5 py-4">
        <div>
          <h1 className="font-display text-xl font-bold text-marca">Autchronos</h1>
          <p className="text-sm opacity-70">
            Gestão financeira e fluxo de caixa para empreendedores
          </p>
        </div>
        <BotaoTema />
      </header>

      <main className="grid gap-4 p-5 sm:grid-cols-2">
        <article className="rounded-xl border border-marca/10 bg-superficie p-4">
          <h2 className="font-display text-sm uppercase tracking-wide opacity-60">Entradas</h2>
          <p className="font-display text-2xl font-bold text-entrada">R$ 340,00</p>
        </article>

        <article className="rounded-xl border border-marca/10 bg-superficie p-4">
          <h2 className="font-display text-sm uppercase tracking-wide opacity-60">Saídas</h2>
          <p className="font-display text-2xl font-bold text-saida">R$ 120,00</p>
        </article>

        <article className="rounded-xl border border-marca/10 bg-superficie p-4 sm:col-span-2">
          <h2 className="font-display text-sm uppercase tracking-wide opacity-60">Meta do mês</h2>
          <p className="font-display text-2xl font-bold text-meta-texto">Meta atingida</p>
        </article>
      </main>
    </div>
  )
}

export default App
