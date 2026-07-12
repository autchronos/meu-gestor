import { temaInicial, alternarTema } from '@/lib/tema'

describe('temaInicial', () => {
  it('usa o tema salvo pelo usuario, ignorando a preferencia do sistema', () => {
    expect(temaInicial('escuro', false)).toBe('escuro')
    expect(temaInicial('claro', true)).toBe('claro')
  })

  it('cai na preferencia do sistema quando nao ha nada salvo', () => {
    expect(temaInicial(null, true)).toBe('escuro')
    expect(temaInicial(null, false)).toBe('claro')
  })

  it('ignora valor invalido no localStorage e usa a preferencia do sistema', () => {
    expect(temaInicial('roxo', true)).toBe('escuro')
    expect(temaInicial('', false)).toBe('claro')
  })
})

describe('alternarTema', () => {
  it('vai e volta entre claro e escuro', () => {
    expect(alternarTema('claro')).toBe('escuro')
    expect(alternarTema('escuro')).toBe('claro')
  })
})
