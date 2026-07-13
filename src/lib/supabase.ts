import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias. ' +
      'Copie .env.local.example para .env.local e rode `npm run db:start`.',
  )
}

// A anon key e PUBLICA por desenho — ela vai para o bundle. Quem protege o dado
// e a RLS, nao a chave. A service_role key NUNCA pode aparecer aqui.
export const supabase = createClient(url, anonKey)
