import { useEffect, useState } from 'react'
import { CHAVE_TEMA, alternarTema, temaInicial, type Tema } from '@/lib/tema'

/**
 * A casca impura em volta de src/lib/tema.ts: localStorage, matchMedia e
 * document ficam TODOS aqui. A decisao de qual tema usar continua sendo uma
 * funcao pura (temaInicial/alternarTema), testavel sem DOM.
 *
 * Convencao: lib/ = puro, sem React. hooks/ = React.
 */

export function useTema() {
  const [tema, setTema] = useState<Tema>(() =>
    temaInicial(
      localStorage.getItem(CHAVE_TEMA),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    localStorage.setItem(CHAVE_TEMA, tema)
  }, [tema])

  return {
    tema,
    alternar: () => setTema(alternarTema),
  }
}
