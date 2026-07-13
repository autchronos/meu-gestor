import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// O App fala com o Supabase logo no mount. Nos testes de UI nao queremos rede:
// o que se prova aqui e o GUARD (sem sessao -> tela de login), nao o Supabase.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(),
    },
  },
}))

import App from '@/App'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('App', () => {
  it('mostra o nome e a tagline do app', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Autchronos')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Gestão financeira e fluxo de caixa para empreendedores'),
    ).toBeInTheDocument()
  })

  it('sem sessao, o guard mostra a tela de login — e NAO o app', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
})
