import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Os valores do `supabase start` local sao FIXOS e publicos — a anon key local e
// a mesma em toda maquina do mundo. Nao ha segredo aqui.
export const URL_LOCAL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
export const ANON_LOCAL =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export function clienteAnonimo(): SupabaseClient {
  return createClient(URL_LOCAL, ANON_LOCAL, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Cria um usuario NOVO e devolve um cliente ja autenticado como ele.
 * E-mail unico por chamada, para nao colidir com corridas anteriores.
 */
export async function criarUsuario(): Promise<{
  cliente: SupabaseClient
  userId: string
  email: string
}> {
  const email = `teste-${crypto.randomUUID()}@autchronos.test`
  const senha = 'senha-de-teste-123'

  const cliente = clienteAnonimo()

  const { data, error } = await cliente.auth.signUp({ email, password: senha })
  if (error) throw new Error(`signUp falhou: ${error.message}`)
  if (!data.user) throw new Error('signUp nao devolveu usuario')
  if (!data.session) {
    throw new Error(
      'signUp nao devolveu sessao — a confirmacao de e-mail deve estar LIGADA. ' +
        'No Supabase local, desligue em supabase/config.toml: [auth.email] enable_confirmations = false',
    )
  }

  return { cliente, userId: data.user.id, email }
}
