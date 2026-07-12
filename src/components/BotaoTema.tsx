import { useTema } from '@/lib/useTema'

export function BotaoTema() {
  const { tema, alternar } = useTema()

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'}
      className="rounded-lg border border-marca/20 px-3 py-2 text-sm text-marca"
    >
      {tema === 'claro' ? 'Escuro' : 'Claro'}
    </button>
  )
}
