import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('mostra o nome e a tagline do app', () => {
    render(<App />)
    expect(screen.getByText('Autchronos')).toBeInTheDocument()
    expect(
      screen.getByText('Gestão financeira e fluxo de caixa para empreendedores'),
    ).toBeInTheDocument()
  })

  it('oferece o botao de alternar tema', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument()
  })
})
