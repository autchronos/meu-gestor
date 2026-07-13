import { describe, it, expect, beforeAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarUsuario } from './apoio'

/**
 * Trigger T1: marcar um "a receber" como pago cria a entrada no caixa.
 * E a mecanica que faz o fiado do caderno desaparecer — se ela duplicar ou
 * esquecer um lancamento, o caixa do cliente mente.
 */
describe('trigger T1: a receber pago -> entrada no caixa', () => {
  let cliente: SupabaseClient
  let negocioId: string
  let clienteId: string

  beforeAll(async () => {
    const u = await criarUsuario()
    cliente = u.cliente

    const { data: n, error: eN } = await cliente.rpc('criar_negocio', {
      p_nome: 'Loja de Teste',
      p_ramo: 'revenda',
    })
    if (eN) throw new Error(`criar_negocio falhou: ${eN.message}`)
    negocioId = n as string

    const { data: c, error: eC } = await cliente
      .from('clientes')
      .insert({ negocio_id: negocioId, nome: 'Maria' })
      .select()
      .single()
    if (eC) throw new Error(`insert do cliente falhou: ${eC.message}`)
    clienteId = c.id
  })

  async function novaDivida(valor: number): Promise<string> {
    const { data, error } = await cliente
      .from('receber')
      .insert({
        negocio_id: negocioId,
        cliente_id: clienteId,
        descricao: 'Fiado da Maria',
        valor,
      })
      .select()
      .single()
    if (error) throw new Error(`insert do receber falhou: ${error.message}`)
    return data.id as string
  }

  async function lancamentosDe(receberId: string) {
    const { data } = await cliente.from('lancamentos').select('*').eq('receber_id', receberId)
    return data ?? []
  }

  it('criar uma divida NAO mexe no caixa', async () => {
    const id = await novaDivida(50)

    expect(await lancamentosDe(id)).toEqual([])
  })

  it('marcar como pago CRIA a entrada, com o valor certo', async () => {
    const id = await novaDivida(120)

    await cliente.from('receber').update({ pago: true }).eq('id', id)

    const lancamentos = await lancamentosDe(id)
    expect(lancamentos).toHaveLength(1)
    expect(lancamentos[0].tipo).toBe('entrada')
    expect(Number(lancamentos[0].valor)).toBe(120)
  })

  it('marcar pago DUAS vezes nao duplica a entrada (idempotente)', async () => {
    const id = await novaDivida(70)

    await cliente.from('receber').update({ pago: true }).eq('id', id)
    await cliente.from('receber').update({ pago: true }).eq('id', id)

    expect(await lancamentosDe(id)).toHaveLength(1)
  })

  it('despagar REMOVE a entrada do caixa', async () => {
    const id = await novaDivida(90)

    await cliente.from('receber').update({ pago: true }).eq('id', id)
    expect(await lancamentosDe(id)).toHaveLength(1)

    await cliente.from('receber').update({ pago: false }).eq('id', id)
    expect(await lancamentosDe(id)).toEqual([])
  })

  it('pagar, despagar e pagar de novo deixa exatamente UMA entrada', async () => {
    const id = await novaDivida(200)

    await cliente.from('receber').update({ pago: true }).eq('id', id)
    await cliente.from('receber').update({ pago: false }).eq('id', id)
    await cliente.from('receber').update({ pago: true }).eq('id', id)

    const lancamentos = await lancamentosDe(id)
    expect(lancamentos).toHaveLength(1)
    expect(Number(lancamentos[0].valor)).toBe(200)
  })
})
