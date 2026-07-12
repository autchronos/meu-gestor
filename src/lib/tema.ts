export type Tema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'autchronos:tema'

export function temaInicial(armazenado: string | null, prefereEscuro: boolean): Tema {
  if (armazenado === 'claro' || armazenado === 'escuro') {
    return armazenado
  }
  return prefereEscuro ? 'escuro' : 'claro'
}

export function alternarTema(atual: Tema): Tema {
  return atual === 'claro' ? 'escuro' : 'claro'
}
