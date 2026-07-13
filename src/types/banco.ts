export type Ramo = 'alimentacao' | 'beleza' | 'revenda' | 'servicos' | 'locacao' | 'outro'
export type TipoLancamento = 'entrada' | 'saida'
export type TipoItem = 'venda' | 'aluguel'
export type TipoCliente = 'pessoa' | 'empresa'
export type Papel = 'dono' | 'operador'

export type Negocio = {
  id: string
  nome: string
  ramo: Ramo
  created_at: string
}

export type Lancamento = {
  id: string
  negocio_id: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  data: string
  categoria_id: string | null
  receber_id: string | null
  origem: 'app' | 'whatsapp'
  origem_msg_id: string | null
  created_at: string
}
