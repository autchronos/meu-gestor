import { createContext, useContext } from 'react'
import type { Tema } from '@/lib/tema'

/**
 * O contexto e o hook moram separados do <TemaProvider> porque um arquivo que
 * exporta componente E nao-componente quebra o fast refresh do Vite.
 *
 * Convencao: lib/ = puro, sem React. hooks/ = React.
 */

export type ContextoTema = {
  tema: Tema
  alternar: () => void
}

export const TemaContexto = createContext<ContextoTema | null>(null)

export function useTema(): ContextoTema {
  const contexto = useContext(TemaContexto)

  if (contexto === null) {
    throw new Error('useTema() exige que o componente esteja dentro de <TemaProvider>.')
  }

  return contexto
}
