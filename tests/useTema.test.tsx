import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '@/App'
import { CHAVE_TEMA } from '@/lib/tema'

/**
 * useTema e o unico codigo impuro do repo: toca localStorage, matchMedia e
 * document. Aqui ele e testado de verdade — clicando no botao — e nao pela
 * funcao pura que ele embrulha (essa vive em tests/lib/tema.test.ts).
 *
 * O estado impuro e global: se nao limparmos, um teste contamina o outro.
 */
function limparEstadoDeTema() {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
}

beforeEach(limparEstadoDeTema)
afterEach(limparEstadoDeTema)

describe('useTema (integracao com o DOM)', () => {
  it('clicar no botao poe a classe dark no <html> e salva "escuro" no localStorage', () => {
    render(<App />)

    expect(document.documentElement).not.toHaveClass('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
  })

  it('clicar de novo volta ao tema claro e tira a classe dark', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ativar tema claro' }))

    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('claro')
  })

  it('respeita o tema escuro ja salvo no localStorage, sem precisar de clique', () => {
    localStorage.setItem(CHAVE_TEMA, 'escuro')

    render(<App />)

    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument()
  })
})
