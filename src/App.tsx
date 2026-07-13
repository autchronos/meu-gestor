import { BotaoTema } from '@/components/BotaoTema'
import { TemaProvider } from '@/hooks/TemaProvider'
import { SessaoProvider } from '@/hooks/SessaoProvider'
import { useSessao } from '@/hooks/sessaoContexto'
import { Auth } from '@/modules/auth/Auth'
import { supabase } from '@/lib/supabase'

function Conteudo() {
  const { sessao, carregando } = useSessao()

  // Sem isto, quem ja esta logado ve a tela de login piscar a cada recarga.
  if (carregando) {
    return <div className="min-h-dvh bg-fundo" />
  }

  if (!sessao) {
    return <Auth />
  }

  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <header className="flex items-center justify-between border-b border-marca/15 px-5 py-4">
        <div>
          <h1 className="font-display text-xl font-bold text-marca">Autchronos</h1>
          <p className="text-sm opacity-70">{sessao.user.email}</p>
        </div>
        <div className="flex gap-2">
          <BotaoTema />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-marca/20 px-3 py-2 text-sm text-marca"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="p-5">
        <p className="opacity-70">
          Conta criada. O onboarding e o catalogo chegam na Fase 2.
        </p>
      </main>
    </div>
  )
}

function App() {
  return (
    <TemaProvider>
      <SessaoProvider>
        <Conteudo />
      </SessaoProvider>
    </TemaProvider>
  )
}

export default App
