import { describe, it, expect } from 'vitest'
import { validaEmail, validaSenha } from '@/lib/validaLogin'

describe('validaEmail', () => {
  it('aceita e-mail valido', () => {
    expect(validaEmail('maria@exemplo.com')).toBeNull()
  })

  it('recusa vazio, sem arroba e sem dominio', () => {
    expect(validaEmail('')).toBe('Informe o e-mail.')
    expect(validaEmail('maria')).toBe('E-mail invalido.')
    expect(validaEmail('maria@')).toBe('E-mail invalido.')
  })

  it('ignora espaco em volta (o teclado do celular adiciona)', () => {
    expect(validaEmail('  maria@exemplo.com  ')).toBeNull()
  })
})

describe('validaSenha', () => {
  it('aceita senha com 6 ou mais caracteres', () => {
    expect(validaSenha('123456')).toBeNull()
  })

  it('recusa vazia e curta demais', () => {
    expect(validaSenha('')).toBe('Informe a senha.')
    expect(validaSenha('123')).toBe('A senha precisa de pelo menos 6 caracteres.')
  })

  it('NAO apara espaco: espaco em senha e caractere valido', () => {
    // 6 caracteres so contando os espacos — se houvesse trim, cairia para 1 e falharia.
    expect(validaSenha('  a   ')).toBeNull()
  })
})
