# Autchronos

App web (PWA) de **gestão financeira e fluxo de caixa para micro-empreendedores**.
Quem usa é o dono do negócio, não um contador: a tela precisa responder "quanto entrou,
quanto saiu, sobrou quanto" sem exigir vocabulário de contabilidade.

Stack: React 19 + TypeScript + Vite + Tailwind v4. Testes com Vitest.
Deploy: estáticos na Hostinger. Backend (Supabase) é a Fase 1 — ainda não existe.

---

## O contrato de cor

Este app fala de dinheiro. Cor aqui não é decoração, é informação — e informação errada
sobre dinheiro é pior do que nenhuma. Por isso:

| Token | Significa | Uso |
| --- | --- | --- |
| `marca` | identidade (azul-petróleo) | logo, títulos, bordas, chrome |
| `entrada` | dinheiro que **entrou** (verde) | exclusivamente entradas |
| `saida` | dinheiro que **saiu** (vermelho) | exclusivamente saídas |
| `meta` / `meta-texto` | **meta atingida** (dourado) | exclusivamente metas |
| `fundo`, `superficie`, `texto` | neutros | estrutura |

As três regras:

1. **A cor da marca NUNCA toca um valor em dinheiro.** Se o azul-petróleo aparece num
   número, o usuário perde a única pista rápida que ele tem de entrada-vs-saída: a marca
   vira ruído no lugar exato onde a cor deveria carregar sentido.
2. **Verde é entrada e vermelho é saída, nada mais.** Não use verde para "sucesso" nem
   vermelho para "erro" ou "excluir" — isso queima o significado. Dourado é meta atingida,
   e só.
3. **Cor crua do Tailwind é PROIBIDA.** Nada de `text-green-600`, `bg-slate-100`. Só
   tokens semânticos.

A terceira regra **se defende sozinha**, em duas camadas:

- `src/index.css` faz `@theme { --color-*: initial; }`, o que apaga a paleta padrão do
  Tailwind. `text-green-600` simplesmente **não gera CSS nenhum**. O sistema falha em
  "sem cor", nunca em "cor errada".
- `tests/contrato-de-cor.test.ts` varre `src/` e falha apontando o arquivo e a classe,
  antes que a falha silenciosa chegue na tela.

**Onde as cores moram:** o único lugar do app com um valor de cor literal é o bloco de
tokens no topo de `src/index.css` (mais o `public/favicon.svg`, que é um arquivo estático
e não enxerga CSS). Cor nova entra lá, como token semântico, ou não entra.

### Tema

Claro é o padrão. Escuro é **escolha explícita** do usuário (classe `.dark` no `<html>`),
nunca `prefers-color-scheme` sozinho — a preferência do sistema só decide o primeiro
acesso, e a escolha salva sempre ganha dela.

Um script inline e bloqueante no `<head>` do `index.html` aplica a classe `.dark` antes do
primeiro paint. Sem ele, quem usa o tema escuro vê o fundo creme piscar a cada recarga
(FOUC), porque o React só aplicaria a classe depois, num `useEffect`. Esse script duplica
de propósito a lógica de `temaInicial()` — **se as duas divergirem, o app volta a piscar:
mude sempre as duas juntas.**

---

## Convenções

- **`src/lib/` = lógica pura, sem React.** Sem `useState`, sem `document`, sem
  `localStorage`. Funções que recebem dados e devolvem dados, testáveis sem DOM. Toda a
  regra de negócio de dinheiro vai viver aqui.
- **`src/hooks/` = React.** É onde a impureza (efeitos, `localStorage`, `matchMedia`) fica
  confinada, embrulhando as funções puras de `lib/`. `useTema` é o exemplo: a decisão de
  qual tema usar é pura (`lib/tema.ts`); só o efeito colateral é hook.
- **`src/components/` = apresentação.**
- Nomes de domínio em português (`entrada`, `saida`, `meta`): o domínio é brasileiro, e
  traduzir de ida e volta é onde bug de sinal nasce.
- Testes ficam em `tests/`, espelhando `src/`. **Sem globais:** importe `describe`/`it`/
  `expect` de `'vitest'`. Os globais de teste vazariam para o type-check de `src/`, e
  código de produção não deve nem enxergar o vocabulário de teste.

---

## Rodando

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # Vitest, uma passada (npm run test:watch para o modo contínuo)
npm run build    # tsc -b + vite build -> dist/
npm run lint     # oxlint
```

O `npm run build` roda o type-check antes de empacotar: build que passa é build
type-checado.

---

## Deploy na Hostinger

O app é 100% estático — não há servidor Node em produção.

1. `npm run build`
2. Suba **o conteúdo de `dist/`** (não a pasta em si) para a `public_html/` da Hostinger,
   via File Manager ou FTP.
3. Garanta que o **`.htaccess` foi junto**. Ele vem de `public/.htaccess` e o Vite o copia
   para `dist/` automaticamente — mas clientes de FTP costumam esconder arquivos que
   começam com ponto. **Confira que ele chegou.**

Sem esse `.htaccess`, o app funciona ao navegar mas **dá 404 ao recarregar a página em
qualquer rota que não seja `/`**: o Apache vai procurar um arquivo `/caixa` que não existe.
A regra manda toda requisição que não bate num arquivo real para o `index.html`, e o
roteamento acontece no cliente.

### Variáveis de ambiente

`.env.local` (fora do git) guarda os segredos; `.env.local.example` documenta o formato.
Só entram variáveis com o prefixo `VITE_` — e **tudo que tem esse prefixo vai para o bundle
e é público**. Nunca ponha ali uma chave que não possa ser lida por qualquer visitante (a
`anon key` do Supabase pode; uma `service_role` jamais).
