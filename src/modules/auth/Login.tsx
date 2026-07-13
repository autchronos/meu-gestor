import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { validaEmail, validaSenha } from '@/lib/validaLogin'

export function Login({ irParaCadastro }: { irParaCadastro: () => void }) {
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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error) {
      // Nao vazamos se o e-mail existe ou nao: a mesma mensagem para os dois casos.
      setErro('E-mail ou senha incorretos.')
      setEnviando(false)
    }
    // Sucesso: o SessaoProvider percebe pelo onAuthStateChange e troca a tela.
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-marca">Entrar</h2>

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
        placeholder="Senha"
        autoComplete="current-password"
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
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>

      <button type="button" onClick={irParaCadastro} className="text-sm text-marca underline">
        Nao tenho conta
      </button>
    </form>
  )
}
