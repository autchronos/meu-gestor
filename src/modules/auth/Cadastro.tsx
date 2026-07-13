import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { validaEmail, validaSenha } from '@/lib/validaLogin'

export function Cadastro({ irParaLogin }: { irParaLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()

    const problema = validaEmail(email) ?? validaSenha(senha)
    if (problema) {
      setErro(problema)
      return
    }

    setEnviando(true)
    setErro(null)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
    })

    if (error) {
      setErro(error.message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-marca">Criar conta</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="email"
        className="rounded-lg border border-marca/20 bg-superficie px-3 py-2"
      />

      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Senha (min. 6 caracteres)"
        autoComplete="new-password"
        className="rounded-lg border border-marca/20 bg-superficie px-3 py-2"
      />

      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-marca px-3 py-2 font-display font-bold text-fundo disabled:opacity-60"
      >
        {enviando ? 'Criando...' : 'Criar conta'}
      </button>

      <button type="button" onClick={irParaLogin} className="text-sm text-marca underline">
        Ja tenho conta
      </button>
    </form>
  )
}
