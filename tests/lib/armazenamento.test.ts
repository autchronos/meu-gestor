import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  gravarArmazenado,
  lerArmazenado,
  prefereEscuroNoSistema,
} from '@/lib/armazenamento'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('armazenamento (a fronteira de I/O do navegador)', () => {
  it('le e grava normalmente quando o navegador colabora', () => {
    gravarArmazenado('chave', 'valor')
    expect(lerArmazenado('chave')).toBe('valor')
  })

  it('devolve null quando a chave nao existe', () => {
    expect(lerArmazenado('inexistente')).toBeNull()
  })

  it('devolve null — e NAO lanca — quando o localStorage esta bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('acesso negado', 'SecurityError')
    })

    expect(() => lerArmazenado('chave')).not.toThrow()
    expect(lerArmazenado('chave')).toBeNull()
  })

  it('vira no-op — e NAO lanca — quando a gravacao e negada', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cota excedida', 'QuotaExceededError')
    })

    expect(() => gravarArmazenado('chave', 'valor')).not.toThrow()
  })

  it('assume tema claro quando o matchMedia lanca', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('indisponivel')
    })

    expect(prefereEscuroNoSistema()).toBe(false)
  })

  it('devolve a preferencia do sistema quando o matchMedia responde', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)

    expect(prefereEscuroNoSistema()).toBe(true)
  })
})
