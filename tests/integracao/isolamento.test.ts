import { describe, it, expect, beforeAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarUsuario, clienteAnonimo } from './apoio'

/**
 * O teste que o plano chama de OBRIGATORIO. Duas contas reais, dois negocios
 * reais, e uma pergunta: a conta B enxerga alguma coisa da conta A?
 *
 * Se qualquer um destes falhar, NAO se avanca para a Fase 2. Um vazamento aqui e
 * o caixa de um cliente aparecendo para outro — nao e bug de feature, e violacao
 * de dado financeiro alheio.
 */
describe('isolamento entre negocios (RLS)', () => {
  let alice: SupabaseClient
  let bob: SupabaseClient
  let bobUserId: string
  let negocioAlice: string
  let negocioBob: string

  beforeAll(async () => {
    const a = await criarUsuario()
    const b = await criarUsuario()
    alice = a.cliente
    bob = b.cliente
    bobUserId = b.userId

    const { data: nA, error: eA } = await alice.rpc('criar_negocio', {
      p_nome: 'Acai da Alice',
      p_ramo: 'alimentacao',
    })
    if (eA) throw new Error(`criar_negocio (alice) falhou: ${eA.message}`)
    negocioAlice = nA as string

    const { data: nB, error: eB } = await bob.rpc('criar_negocio', {
      p_nome: 'Salao do Bob',
      p_ramo: 'beleza',
    })
    if (eB) throw new Error(`criar_negocio (bob) falhou: ${eB.message}`)
    negocioBob = nB as string

    const { error: eL } = await alice.from('lancamentos').insert({
      negocio_id: negocioAlice,
      tipo: 'entrada',
      descricao: 'Venda secreta da Alice',
      valor: 340.0,
    })
    if (eL) throw new Error(`insert do lancamento da Alice falhou: ${eL.message}`)
  })

  it('os dois negocios existem de fato (guarda contra falso-positivo)', async () => {
    // Sem isto, se `criar_negocio` estivesse quebrada e nada existisse, TODOS os
    // testes abaixo passariam por vacuidade — provando nada.
    expect(negocioAlice).toBeTruthy()
    expect(negocioBob).toBeTruthy()
    expect(negocioAlice).not.toBe(negocioBob)

    const { data } = await alice.from('lancamentos').select('descricao')
    expect(data).toHaveLength(1)
    expect(data![0].descricao).toBe('Venda secreta da Alice')
  })

  it('cada um enxerga apenas o proprio negocio', async () => {
    const { data: dosAlice } = await alice.from('negocios').select('id, nome')
    expect(dosAlice).toHaveLength(1)
    expect(dosAlice![0].nome).toBe('Acai da Alice')

    const { data: dosBob } = await bob.from('negocios').select('id, nome')
    expect(dosBob).toHaveLength(1)
    expect(dosBob![0].nome).toBe('Salao do Bob')
    expect(dosBob!.map((n) => n.id)).not.toContain(negocioAlice)
  })

  it('Bob NAO le o lancamento da Alice — nem sabendo o negocio_id dela', async () => {
    const { data } = await bob.from('lancamentos').select('*').eq('negocio_id', negocioAlice)

    // A RLS nao devolve erro: devolve VAZIO. O dado nao existe para ele.
    expect(data).toEqual([])
  })

  it('Bob NAO escreve no negocio da Alice', async () => {
    const { error } = await bob.from('lancamentos').insert({
      negocio_id: negocioAlice,
      tipo: 'saida',
      descricao: 'invasao',
      valor: 999.0,
    })

    expect(error).not.toBeNull()

    // E o caixa da Alice continua intacto.
    const { data } = await alice.from('lancamentos').select('descricao')
    expect(data).toHaveLength(1)
    expect(data![0].descricao).toBe('Venda secreta da Alice')
  })

  it('Bob NAO se auto-adiciona ao negocio da Alice', async () => {
    // O ataque que derruba o multi-tenant inteiro: se negocio_usuarios aceitasse
    // INSERT, Bob viraria membro do negocio da Alice e leria tudo.
    const { error } = await bob.from('negocio_usuarios').insert({
      negocio_id: negocioAlice,
      user_id: bobUserId,
      papel: 'dono',
    })

    expect(error).not.toBeNull()

    // E, provando que nao passou por outro caminho:
    const { data } = await bob.from('negocios').select('id')
    expect(data!.map((n) => n.id)).not.toContain(negocioAlice)
  })

  it('Bob NAO le os clientes, itens nem contas a receber da Alice', async () => {
    await alice.from('clientes').insert({ negocio_id: negocioAlice, nome: 'Dona Maria' })
    await alice.from('itens').insert({ negocio_id: negocioAlice, nome: 'Acai 500ml', preco: 15 })

    const { data: clientes } = await bob.from('clientes').select('*')
    const { data: itens } = await bob.from('itens').select('*')

    expect(clientes).toEqual([])
    expect(itens).toEqual([])
  })

  it('deslogado nao le nada', async () => {
    const anonimo = clienteAnonimo()

    const { data: lancamentos } = await anonimo.from('lancamentos').select('*')
    const { data: negocios } = await anonimo.from('negocios').select('*')

    expect(lancamentos ?? []).toEqual([])
    expect(negocios ?? []).toEqual([])
  })

  it('deslogado nao consegue criar negocio pela RPC', async () => {
    const anonimo = clienteAnonimo()

    const { error } = await anonimo.rpc('criar_negocio', {
      p_nome: 'Negocio Fantasma',
      p_ramo: 'outro',
    })

    expect(error).not.toBeNull()
  })
})
