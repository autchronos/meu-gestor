import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

const RAIZ_SRC = join(process.cwd(), 'src')

const MENSAGEM =
  'Cor crua e PROIBIDA no Autchronos. Use somente os tokens semanticos de ' +
  'src/index.css (fundo, superficie, texto, marca, entrada, saida, meta, meta-texto). ' +
  'Lembre: a cor da marca NUNCA toca um valor em dinheiro; verde e entrada, ' +
  'vermelho e saida, dourado e meta atingida.\nInfracoes:\n  '

/** As 22 cores da paleta padrao do Tailwind. Nenhuma delas existe no Autchronos. */
const CORES_CRUAS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
].join('|')

const PROPRIEDADES =
  'text|bg|border|ring|outline|fill|stroke|from|via|to|shadow|accent|caret|divide|decoration|placeholder'

/**
 * Tres portas de entrada de cor crua, e o app tem que barrar as tres.
 *
 * 1. PALETA: `text-green-600`. Ja nao gera CSS (src/index.css apaga --color-*),
 *    mas continua sendo erro de intencao — falha aqui para o autor descobrir na
 *    hora, e nao depois de olhar uma tela sem cor nenhuma.
 * 2. ARBITRARIA: `text-[#00FF00]`. Esta GERA CSS e passa pelo build — apagar a
 *    paleta nao a bloqueia. E o caminho que alguem com pressa usa. So este teste
 *    a impede.
 * 3. INLINE: `style={{ color: '#00FF00' }}`. Fura tudo, ate o Tailwind.
 */
const REGRAS: { nome: string; regex: RegExp }[] = [
  {
    nome: 'paleta padrao do Tailwind',
    regex: new RegExp(
      String.raw`\b(?:[a-z0-9-]+:)*[a-z-]*(?:${PROPRIEDADES})-(?:${CORES_CRUAS})-\d{2,3}\b`,
      'g',
    ),
  },
  {
    nome: 'valor de cor arbitrario',
    // So o que e mesmo COR: text-[14px] e bg-[url(...)] continuam permitidos.
    regex: new RegExp(
      String.raw`\b(?:[a-z0-9-]+:)*[a-z-]*(?:${PROPRIEDADES})-\[\s*(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\(|(?:${CORES_CRUAS}|white|black)\b)[^\]]*\]`,
      'g',
    ),
  },
  {
    nome: 'cor em style inline',
    regex: /\b(?:color|backgroundColor|borderColor|outlineColor|fill|stroke)\s*:\s*['"`]/g,
  },
]

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) return arquivosFonte(caminho)
    return /\.tsx?$/.test(entrada.name) ? [caminho] : []
  })
}

describe('contrato de cor', () => {
  it('nenhum arquivo de src/ usa cor crua, arbitraria ou inline', () => {
    const infracoes: string[] = []

    for (const arquivo of arquivosFonte(RAIZ_SRC)) {
      const conteudo = readFileSync(arquivo, 'utf8')

      for (const { nome, regex } of REGRAS) {
        for (const achado of new Set(conteudo.match(regex) ?? [])) {
          infracoes.push(`${relative(process.cwd(), arquivo)}: "${achado}" (${nome})`)
        }
      }
    }

    expect(infracoes, MENSAGEM + infracoes.join('\n  ')).toEqual([])
  })

  it('as regras reconhecem cada uma das tres portas (o teste nao e um no-op)', () => {
    const [paleta, arbitraria, inline] = REGRAS.map((r) => r.regex)

    // 1. paleta
    expect('className="text-green-600"'.match(paleta)).toEqual(['text-green-600'])
    expect('className="dark:bg-slate-900/50"'.match(paleta)).toEqual(['dark:bg-slate-900'])

    // 2. arbitraria — a porta que o build deixa passar
    expect('className="text-[#00FF00]"'.match(arbitraria)).toEqual(['text-[#00FF00]'])
    expect('className="bg-[rgb(255,0,0)]"'.match(arbitraria)).toEqual(['bg-[rgb(255,0,0)]'])
    expect('className="hover:border-[red]"'.match(arbitraria)).toEqual(['hover:border-[red]'])

    // 3. inline
    expect(`style={{ color: '#00FF00' }}`.match(inline)).toEqual([`color: '`])
    expect(`style={{ backgroundColor: "red" }}`.match(inline)).toEqual([`backgroundColor: "`])

    // E nada disso pode ser falso positivo:
    expect('className="text-entrada bg-fundo border-marca/20"'.match(paleta)).toBeNull()
    expect('className="text-[14px] bg-[url(/logo.svg)]"'.match(arbitraria)).toBeNull()
    expect('const cor: string = tema'.match(inline)).toBeNull()
  })
})
