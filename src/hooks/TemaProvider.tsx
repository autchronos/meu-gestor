import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CHAVE_TEMA, alternarTema, temaInicial, type Tema } from '@/lib/tema'
import { gravarArmazenado, lerArmazenado, prefereEscuroNoSistema } from '@/lib/armazenamento'
import { TemaContexto } from '@/hooks/temaContexto'

/**
 * A casca impura em volta de src/lib/tema.ts. A decisao de qual tema usar
 * continua sendo funcao pura (temaInicial/alternarTema); o I/O do navegador
 * mora em src/lib/armazenamento.ts, que nunca lanca.
 *
 * O estado e UNICO, num contexto: dois seletores de tema na tela (o botao do
 * header e o da futura tela de Config) tem que concordar entre si. Estado
 * dentro do hook daria a cada consumidor a sua propria copia, dessincronizada.
 * A sessao do usuario, na Fase 1, segue este mesmo padrao.
 */

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() =>
    temaInicial(lerArmazenado(CHAVE_TEMA), prefereEscuroNoSistema()),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    gravarArmazenado(CHAVE_TEMA, tema)
  }, [tema])

  const valor = useMemo(() => ({ tema, alternar: () => setTema(alternarTema) }), [tema])

  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>
}
