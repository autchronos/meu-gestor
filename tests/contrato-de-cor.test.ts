import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

const RAIZ_SRC = join(process.cwd(), 'src')

/** As 22 cores da paleta padrao do Tailwind. Nenhuma delas existe no Autchronos. */
const CORES_CRUAS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
].join('|')

/**
 * Pega `text-green-600`, `bg-blue-500/40`, `hover:border-red-400`,
 * `dark:from-slate-900` — qualquer utilitario com uma cor crua + tom numerico.
 */
const PROPRIEDADES =
  'text|bg|border|ring|outline|fill|stroke|from|via|to|shadow|accent|caret|divide|decoration|placeholder'

const REGEX_COR_CRUA = new RegExp(
  // variantes opcionais (dark:, hover:, sm:...) + propriedade + cor crua + tom
  String.raw`\b(?:[a-z0-9-]+:)*[a-z-]*(?:${PROPRIEDADES})-(?:${CORES_CRUAS})-\d{2,3}\b`,
  'g',
)

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) return arquivosFonte(caminho)
    return /\.tsx?$/.test(entrada.name) ? [caminho] : []
  })
}

describe('contrato de cor', () => {
  it('nenhum arquivo de src/ usa a paleta crua do Tailwind', () => {
    const infracoes: string[] = []

    for (const arquivo of arquivosFonte(RAIZ_SRC)) {
      const achados = readFileSync(arquivo, 'utf8').match(REGEX_COR_CRUA)
      if (achados) {
        for (const classe of new Set(achados)) {
          infracoes.push(`${relative(process.cwd(), arquivo)}: "${classe}"`)
        }
      }
    }

    expect(
      infracoes,
      'Cor crua do Tailwind e PROIBIDA no Autchronos. Use somente os tokens ' +
        'semanticos de src/index.css (fundo, superficie, texto, marca, entrada, ' +
        'saida, meta, meta-texto). Lembre: a cor da marca NUNCA toca um valor em ' +
        'dinheiro; verde e entrada, vermelho e saida, dourado e meta atingida.\n' +
        `Infracoes:\n  ${infracoes.join('\n  ')}`,
    ).toEqual([])
  })

  it('a propria regex reconhece uma infracao (o teste nao e um no-op)', () => {
    expect('className="text-green-600"'.match(REGEX_COR_CRUA)).toEqual(['text-green-600'])
    expect('className="dark:bg-slate-900/50"'.match(REGEX_COR_CRUA)).toEqual(['dark:bg-slate-900'])
    expect('className="text-entrada bg-fundo border-marca/20"'.match(REGEX_COR_CRUA)).toBeNull()
  })
})
