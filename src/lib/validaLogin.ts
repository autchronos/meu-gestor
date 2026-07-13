/** Devolve a mensagem de erro, ou null quando esta valido. Puro: sem React, sem rede. */

export function validaEmail(email: string): string | null {
  const limpo = email.trim()

  if (limpo === '') return 'Informe o e-mail.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'E-mail invalido.'

  return null
}

export function validaSenha(senha: string): string | null {
  // Senha NAO leva trim: espaco e caractere valido.
  if (senha === '') return 'Informe a senha.'
  if (senha.length < 6) return 'A senha precisa de pelo menos 6 caracteres.'

  return null
}
