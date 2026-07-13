import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type ContextoSessao = {
  sessao: Session | null
  carregando: boolean
}

export const SessaoContexto = createContext<ContextoSessao | null>(null)

export function useSessao(): ContextoSessao {
  const contexto = useContext(SessaoContexto)

  if (contexto === null) {
    throw new Error('useSessao() exige que o componente esteja dentro de <SessaoProvider>.')
  }

  return contexto
}
