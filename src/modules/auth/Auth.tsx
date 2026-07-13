import { useState } from 'react'
import { Login } from '@/modules/auth/Login'
import { Cadastro } from '@/modules/auth/Cadastro'

export function Auth() {
  const [tela, setTela] = useState<'login' | 'cadastro'>('login')

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-marca">Autchronos</h1>
        <p className="text-sm opacity-70">
          Gestão financeira e fluxo de caixa para empreendedores
        </p>
      </div>

      {tela === 'login' ? (
        <Login irParaCadastro={() => setTela('cadastro')} />
      ) : (
        <Cadastro irParaLogin={() => setTela('login')} />
      )}
    </div>
  )
}
