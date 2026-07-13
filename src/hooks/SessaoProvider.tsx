import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { SessaoContexto } from '@/hooks/sessaoContexto'

/**
 * Estado UNICO da sessao, num contexto — mesmo padrao do TemaProvider.
 * `carregando` existe para nao piscar a tela de login enquanto o Supabase ainda
 * esta lendo a sessao salva: sem isso, quem ja esta logado ve o login por um
 * instante a cada recarga.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setCarregando(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const valor = useMemo(() => ({ sessao, carregando }), [sessao, carregando])

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>
}
