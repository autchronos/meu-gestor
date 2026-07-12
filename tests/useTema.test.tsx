import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '@/App'
import { TemaProvider } from '@/hooks/TemaProvider'
import { useTema } from '@/hooks/temaContexto'
import { CHAVE_TEMA } from '@/lib/tema'

/**
 * useTema e a unica peca impura do app: toca localStorage, matchMedia e document.
 * Por isso ele e testado de verdade, pelo DOM — e nao pela funcao pura que ele
 * embrulha (essa vive em tests/lib/tema.test.ts).
 *
 * O estado impuro e global: sem limpar, um teste contamina o outro.
 */
function limparEstadoDeTema() {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
}

beforeEach(limparEstadoDeTema)
afterEach(() => {
  limparEstadoDeTema()
  vi.restoreAllMocks()
})

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

  it('adota o tema escuro quando o SISTEMA prefere escuro e nada foi salvo', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)

    render(<App />)

    expect(document.documentElement).toHaveClass('dark')
  })
})

describe('useTema com o navegador hostil', () => {
  it('nao derruba o app quando o localStorage LANCA (Safari privado, webview de app)', () => {
    // E o cenario do nosso usuario: ele abre o link pelo WhatsApp. Se isso
    // estourar durante o render, o React desmonta a arvore e ele ve tela branca.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('acesso negado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('acesso negado', 'SecurityError')
    })

    render(<App />)

    // O app abre normalmente, no tema claro, so sem persistir a escolha.
    expect(screen.getByText('Autchronos')).toBeInTheDocument()
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' })),
    ).not.toThrow()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('nao derruba o app quando o matchMedia LANCA', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('matchMedia indisponivel')
    })

    render(<App />)

    expect(screen.getByText('Autchronos')).toBeInTheDocument()
  })
})

function Sonda() {
  const { tema, alternar } = useTema()
  return (
    <>
      <button type="button" onClick={alternar}>
        alternar
      </button>
      <output>sonda ve: {tema}</output>
    </>
  )
}

function SondaEspelho() {
  const { tema } = useTema()
  return <output>espelho ve: {tema}</output>
}

describe('estado do tema e unico (contexto, nao copia por componente)', () => {
  it('dois consumidores enxergam o MESMO tema apos um deles alternar', () => {
    render(
      <TemaProvider>
        <Sonda />
        <SondaEspelho />
      </TemaProvider>,
    )

    expect(screen.getByText('sonda ve: claro')).toBeInTheDocument()
    expect(screen.getByText('espelho ve: claro')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'alternar' }))

    // Se o estado morasse dentro do hook, o espelho continuaria em "claro".
    expect(screen.getByText('sonda ve: escuro')).toBeInTheDocument()
    expect(screen.getByText('espelho ve: escuro')).toBeInTheDocument()
  })

  it('useTema fora do TemaProvider falha alto, em vez de silenciosamente', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<SondaEspelho />)).toThrow(/TemaProvider/)
  })
})
