# Autchronos — Fase 0 (Fundação e Identidade) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o app Autchronos rodando em branco, com a identidade visual nova aplicada, testes configurados e pronto para receber o banco na Fase 1.

**Architecture:** SPA em React 19 + Vite + TypeScript. As cores entram como **tokens semânticos em CSS** (Tailwind v4, via `@theme`), nunca como cores cruas — o token troca de valor entre tema claro e escuro sem que nenhum componente saiba disso. A lógica de tema vive em funções puras testáveis (`src/lib/tema.ts`), fora do React, seguindo a decisão D8 do plano original.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, Vitest, Testing Library, @fontsource (Space Grotesk + Inter).

## Global Constraints

- **Nome do app:** `Autchronos`. Tagline: `Gestão financeira e fluxo de caixa para empreendedores`. Usar exatamente assim em `package.json`, `<title>`, e na UI.
- **A cor da marca NUNCA é usada em um valor monetário.** Verde (`entrada`) e vermelho (`saida`) são reservados exclusivamente para dinheiro. Dourado (`meta`) é exclusivo de meta atingida.
- **Proibido usar cor crua do Tailwind** (`text-green-600`, `bg-blue-500`, etc.) em qualquer lugar. Só tokens semânticos: `fundo`, `superficie`, `texto`, `marca`, `entrada`, `saida`, `meta`, `meta-texto`.
- **Tema claro é o padrão.** Escuro é opcional, escolhido pelo usuário.
- **Dourado como texto** deve usar `meta-texto` (`#8F6A14`), nunca `meta` (`#B98A22` reprova em contraste WCAG AA sobre o fundo claro).
- **Sem glow, sem neon, sem sombra colorida.** O caráter técnico vem da estrutura: cards nítidos, ícones lineares, tipografia.
- **Escopo:** nada de banco, auth ou módulos de negócio nesta fase (risco R6 do plano: as fases são sequenciais de propósito).
- **Plataforma:** Windows, PowerShell. Comandos abaixo assumem isso.

### Valores dos tokens (fonte da verdade)

| Token         | Claro     | Escuro    |
|---------------|-----------|-----------|
| `fundo`       | `#F6F7F3` | `#12171F` |
| `superficie`  | `#FFFFFF` | `#1A2230` |
| `texto`       | `#12171F` | `#E8EAED` |
| `marca`       | `#1E3A5F` | `#7FB0E0` |
| `entrada`     | `#2E7D32` | `#5CBF63` |
| `saida`       | `#C62828` | `#F1706B` |
| `meta`        | `#B98A22` | `#D9A93C` |
| `meta-texto`  | `#8F6A14` | `#D9A93C` |

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `vite.config.ts` | Plugins (react, tailwind), alias `@/`, config do Vitest |
| `tsconfig.app.json` | Resolução do alias `@/` para o TypeScript |
| `src/index.css` | **Único lugar onde cor existe.** Tokens claro/escuro + `@theme` |
| `src/lib/tema.ts` | Funções puras de tema (sem React, sem DOM) — é o que se testa |
| `src/lib/useTema.ts` | Hook React: aplica a classe `.dark` e persiste no localStorage |
| `src/components/BotaoTema.tsx` | Botão de alternar tema |
| `src/App.tsx` | Casca visual: header com marca + amostra dos tokens de dinheiro |
| `tests/setup.ts` | Setup do Testing Library |
| `tests/lib/tema.test.ts` | Testes das funções puras de tema |
| `tests/App.test.tsx` | Smoke test da casca |
| `.env.local.example` | Contrato das variáveis do Supabase (Fase 1) |
| `public/.htaccess` | Rewrite de SPA para a Hostinger |

---

## Task 1: Scaffold do projeto e git

**Files:**
- Create: projeto Vite inteiro na raiz, `.gitignore`, `package.json`
- Modify: `package.json` (nome do app)

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: projeto Vite funcional com `npm run dev`; scripts `dev`, `build`, `preview`

- [ ] **Step 1: Criar o projeto Vite na pasta atual**

A pasta já contém `PLANO-DE-ACAO-APP-MEI.txt` e `docs/`. O Vite aceita criar numa pasta não-vazia (ele pergunta e oferece "Ignore files and continue").

Run:
```powershell
npm create vite@latest . -- --template react-ts
```
Se ele perguntar sobre a pasta não estar vazia, escolher **Ignore files and continue**. Nenhum arquivo existente deve ser apagado.

- [ ] **Step 2: Instalar as dependências e conferir que o app sobe**

Run:
```powershell
npm install
npm run dev
```
Expected: servidor sobe em `http://localhost:5173` e mostra a página padrão do Vite + React. Encerrar com `Ctrl+C`.

- [ ] **Step 3: Ajustar o nome no package.json**

Em `package.json`, trocar o campo `name`:
```json
{
  "name": "autchronos",
  "private": true,
  "version": "0.1.0",
  "type": "module"
}
```

- [ ] **Step 4: Inicializar o git e commitar**

Run:
```powershell
git init
git add -A
git commit -m "chore: scaffold inicial do Autchronos (Vite + React + TS)"
```
Expected: commit criado. O `.gitignore` gerado pelo Vite já ignora `node_modules` e `.env.local` — confirmar que `.env.local` está listado; se não estiver, adicionar.

---

## Task 2: Vitest, alias `@/` e as funções puras de tema

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`
- Create: `tests/setup.ts`
- Create: `src/lib/tema.ts`
- Test: `tests/lib/tema.test.ts`

**Interfaces:**
- Consumes: projeto Vite da Task 1
- Produces:
  - comando `npm test`; alias `@/` resolvendo para `src/` no Vite, no TypeScript e no Vitest
  - `type Tema = 'claro' | 'escuro'`
  - `const CHAVE_TEMA: string`
  - `temaInicial(armazenado: string | null, prefereEscuro: boolean): Tema`
  - `alternarTema(atual: Tema): Tema`

A lógica de tema é pura (sem React, sem DOM) e por isso é o primeiro código real do
projeto — ela prova a configuração de teste sem depender de CSS nenhum.

- [ ] **Step 1: Instalar as dependências de teste**

Run:
```powershell
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @types/node
```

- [ ] **Step 2: Escrever os testes que falham**

Create `tests/lib/tema.test.ts`:
```ts
import { temaInicial, alternarTema } from '@/lib/tema'

describe('temaInicial', () => {
  it('usa o tema salvo pelo usuario, ignorando a preferencia do sistema', () => {
    expect(temaInicial('escuro', false)).toBe('escuro')
    expect(temaInicial('claro', true)).toBe('claro')
  })

  it('cai na preferencia do sistema quando nao ha nada salvo', () => {
    expect(temaInicial(null, true)).toBe('escuro')
    expect(temaInicial(null, false)).toBe('claro')
  })

  it('ignora valor invalido no localStorage e usa a preferencia do sistema', () => {
    expect(temaInicial('roxo', true)).toBe('escuro')
    expect(temaInicial('', false)).toBe('claro')
  })
})

describe('alternarTema', () => {
  it('vai e volta entre claro e escuro', () => {
    expect(alternarTema('claro')).toBe('escuro')
    expect(alternarTema('escuro')).toBe('claro')
  })
})
```

- [ ] **Step 3: Rodar o teste para ver falhar**

Run:
```powershell
npx vitest run
```
Expected: FAIL — o Vitest ainda não está configurado e `@/lib/tema` não existe.

- [ ] **Step 4: Criar o setup do Testing Library**

Create `tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 5: Configurar o Vite (plugins, alias e Vitest num só lugar)**

Replace `vite.config.ts` com:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
```

- [ ] **Step 6: Ensinar o alias ao TypeScript**

Em `tsconfig.app.json`, dentro de `compilerOptions`, adicionar:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
Também garantir que `tests` está no `include` do `tsconfig.app.json`:
```json
{
  "include": ["src", "tests"]
}
```

- [ ] **Step 7: Adicionar o script de teste**

Em `package.json`, na seção `scripts`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 8: Escrever as funções puras de tema**

Create `src/lib/tema.ts`:
```ts
export type Tema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'autchronos:tema'

export function temaInicial(armazenado: string | null, prefereEscuro: boolean): Tema {
  if (armazenado === 'claro' || armazenado === 'escuro') {
    return armazenado
  }
  return prefereEscuro ? 'escuro' : 'claro'
}

export function alternarTema(atual: Tema): Tema {
  return atual === 'claro' ? 'escuro' : 'claro'
}
```

- [ ] **Step 9: Rodar os testes**

Run:
```powershell
npm test
```
Expected: PASS — 4 testes. Isso prova de uma vez só que o Vitest, o alias `@/` e o jsdom funcionam.

- [ ] **Step 10: Commitar**

```powershell
git add -A
git commit -m "feat: configurar Vitest e alias @/, com as funcoes puras de tema"
```

---

## Task 3: Tailwind v4 com tokens semânticos e fontes

**Files:**
- Modify: `vite.config.ts` (adicionar plugin do Tailwind)
- Modify: `src/index.css` (reescrever inteiro)
- Modify: `src/main.tsx` (importar as fontes)
- Delete: `src/App.css` (não será usado — todo estilo vem de utilitários)

**Interfaces:**
- Consumes: `vite.config.ts` da Task 2
- Produces: classes utilitárias `bg-fundo`, `bg-superficie`, `text-texto`, `text-marca`, `bg-marca`, `text-entrada`, `text-saida`, `bg-meta`, `text-meta-texto`, `font-display`, `font-sans`. Todas trocam de valor automaticamente quando a classe `dark` está na tag `<html>`.

- [ ] **Step 1: Instalar Tailwind v4 e as fontes**

Run:
```powershell
npm install tailwindcss @tailwindcss/vite
npm install @fontsource/space-grotesk @fontsource/inter
```

As fontes vêm como pacote npm (não via CDN do Google) de propósito: o app é um PWA e precisa funcionar sem rede.

- [ ] **Step 2: Adicionar o plugin do Tailwind ao Vite**

Em `vite.config.ts`, importar e registrar o plugin. O arquivo fica:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
```

- [ ] **Step 3: Escrever o sistema de cores**

Replace `src/index.css` inteiro com:
```css
@import "tailwindcss";

/* O tema escuro é uma escolha explícita do usuário (classe .dark no <html>),
   não a preferência do sistema. Quem decide é src/lib/tema.ts. */
@custom-variant dark (&:where(.dark, .dark *));

/* ---- Tokens: o ÚNICO lugar do app onde um valor de cor aparece ---- */
:root {
  --cor-fundo: #F6F7F3;
  --cor-superficie: #FFFFFF;
  --cor-texto: #12171F;
  --cor-marca: #1E3A5F;
  --cor-entrada: #2E7D32;
  --cor-saida: #C62828;
  --cor-meta: #B98A22;
  --cor-meta-texto: #8F6A14; /* dourado escurecido: o de cima reprova em contraste como texto */
}

.dark {
  --cor-fundo: #12171F;
  --cor-superficie: #1A2230;
  --cor-texto: #E8EAED;
  --cor-marca: #7FB0E0;
  --cor-entrada: #5CBF63;
  --cor-saida: #F1706B;
  --cor-meta: #D9A93C;
  --cor-meta-texto: #D9A93C;
}

/* ---- Os tokens viram utilitários do Tailwind ---- */
@theme inline {
  --color-fundo: var(--cor-fundo);
  --color-superficie: var(--cor-superficie);
  --color-texto: var(--cor-texto);
  --color-marca: var(--cor-marca);
  --color-entrada: var(--cor-entrada);
  --color-saida: var(--cor-saida);
  --color-meta: var(--cor-meta);
  --color-meta-texto: var(--cor-meta-texto);

  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
}

body {
  background-color: var(--cor-fundo);
  color: var(--cor-texto);
  font-family: var(--font-sans);
}
```

- [ ] **Step 4: Carregar as fontes**

Em `src/main.tsx`, adicionar os imports no topo (antes do `import './index.css'`):
```tsx
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import './index.css'
```

- [ ] **Step 5: Remover o CSS padrão do Vite**

Deletar `src/App.css` e remover a linha `import './App.css'` de `src/App.tsx`.

Run:
```powershell
Remove-Item src/App.css
```

- [ ] **Step 6: Verificar que o build passa**

Run:
```powershell
npm run build
```
Expected: build conclui sem erro. (O `App.tsx` ainda é o padrão do Vite; ele é substituído na Task 4.)

- [ ] **Step 7: Commitar**

```powershell
git add -A
git commit -m "feat: sistema de cores em tokens semanticos (Tailwind v4) e fontes"
```

---

## Task 4: Tema claro/escuro e a casca visual

**Files:**
- Create: `src/lib/useTema.ts`
- Create: `src/components/BotaoTema.tsx`
- Modify: `src/App.tsx` (reescrever)
- Modify: `index.html` (título e lang)
- Test: `tests/App.test.tsx`

**Interfaces:**
- Consumes:
  - tokens da Task 3 (`bg-fundo`, `bg-superficie`, `text-texto`, `text-marca`, `text-entrada`, `text-saida`, `text-meta-texto`, `font-display`)
  - da Task 2: `type Tema = 'claro' | 'escuro'`, `CHAVE_TEMA`, `temaInicial(armazenado, prefereEscuro)`, `alternarTema(atual)`
- Produces: `useTema(): { tema: Tema; alternar: () => void }`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('mostra o nome e a tagline do app', () => {
    render(<App />)
    expect(screen.getByText('Autchronos')).toBeInTheDocument()
    expect(
      screen.getByText('Gestão financeira e fluxo de caixa para empreendedores'),
    ).toBeInTheDocument()
  })

  it('oferece o botao de alternar tema', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run:
```powershell
npx vitest run tests/App.test.tsx
```
Expected: FAIL — `Unable to find an element with the text: Autchronos` (o `App` ainda é o padrão do Vite).

- [ ] **Step 3: Escrever o hook que fala com o DOM**

Create `src/lib/useTema.ts`:
```ts
import { useEffect, useState } from 'react'
import { CHAVE_TEMA, alternarTema, temaInicial, type Tema } from '@/lib/tema'

export function useTema() {
  const [tema, setTema] = useState<Tema>(() =>
    temaInicial(
      localStorage.getItem(CHAVE_TEMA),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    localStorage.setItem(CHAVE_TEMA, tema)
  }, [tema])

  return {
    tema,
    alternar: () => setTema(alternarTema),
  }
}
```

- [ ] **Step 4: Escrever o botão de tema**

Create `src/components/BotaoTema.tsx`:
```tsx
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
```

- [ ] **Step 5: Escrever a casca do app**

Replace `src/App.tsx` inteiro com:
```tsx
import { BotaoTema } from '@/components/BotaoTema'

function App() {
  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <header className="flex items-center justify-between border-b border-marca/15 px-5 py-4">
        <div>
          <h1 className="font-display text-xl font-bold text-marca">Autchronos</h1>
          <p className="text-sm opacity-70">
            Gestão financeira e fluxo de caixa para empreendedores
          </p>
        </div>
        <BotaoTema />
      </header>

      <main className="grid gap-4 p-5 sm:grid-cols-2">
        <article className="rounded-xl border border-marca/10 bg-superficie p-4">
          <h2 className="font-display text-sm uppercase tracking-wide opacity-60">Entradas</h2>
          <p className="font-display text-2xl font-bold text-entrada">R$ 340,00</p>
        </article>

        <article className="rounded-xl border border-marca/10 bg-superficie p-4">
          <h2 className="font-display text-sm uppercase tracking-wide opacity-60">Saídas</h2>
          <p className="font-display text-2xl font-bold text-saida">R$ 120,00</p>
        </article>

        <article className="rounded-xl border border-marca/10 bg-superficie p-4 sm:col-span-2">
          <h2 className="font-display text-sm uppercase tracking-wide opacity-60">Meta do mês</h2>
          <p className="font-display text-2xl font-bold text-meta-texto">Meta atingida</p>
        </article>
      </main>
    </div>
  )
}

export default App
```

Esses valores são **amostra visual da Fase 0** — servem para provar que os tokens funcionam nos dois temas. A Fase 6 substitui isso por dados reais.

- [ ] **Step 6: Ajustar o `index.html`**

Em `index.html`, trocar `lang` e `<title>`:
```html
<html lang="pt-BR">
```
```html
<title>Autchronos — Gestão financeira e fluxo de caixa</title>
```

- [ ] **Step 7: Rodar todos os testes**

Run:
```powershell
npm test
```
Expected: PASS — 6 testes (os 4 de `tema.test.ts`, vindos da Task 2, e os 2 de `App.test.tsx`).

- [ ] **Step 8: Conferir com o olho**

Run:
```powershell
npm run dev
```
Verificar em `http://localhost:5173`:
1. Fundo claro creme, header com "Autchronos" em azul-petróleo.
2. Valor de entrada verde, valor de saída vermelho, meta em dourado escurecido.
3. Clicar em "Escuro": tudo troca, os verdes/vermelhos **continuam visíveis** e a marca vira azul-claro.
4. Recarregar a página: o tema escolhido **persiste**.

Encerrar com `Ctrl+C`.

- [ ] **Step 9: Commitar**

```powershell
git add -A
git commit -m "feat: tema claro/escuro e casca visual do Autchronos"
```

---

## Task 5: Contrato de ambiente e deploy na Hostinger

**Files:**
- Create: `.env.local.example`
- Create: `.env.local`
- Create: `public/.htaccess`
- Modify: `.gitignore` (garantir que `.env.local` está ignorado)

**Interfaces:**
- Consumes: build da Task 3
- Produces: `dist/.htaccess` no build; variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` documentadas para a Fase 1

- [ ] **Step 1: Documentar as variáveis de ambiente**

Create `.env.local.example`:
```
# Supabase — projeto NOVO, nao reusar o do Pantera Roxa.
# Pegar em: Supabase > Project Settings > API
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

- [ ] **Step 2: Criar o `.env.local` local**

Run:
```powershell
Copy-Item .env.local.example .env.local
```
Os valores reais entram na Fase 1, quando o projeto Supabase for criado. Este arquivo **não** é commitado.

- [ ] **Step 3: Confirmar que o segredo está ignorado**

Verificar que `.gitignore` contém `*.local` ou `.env.local`. O `.gitignore` do Vite já traz `*.local`, o que cobre. Se não trouxer, adicionar `.env.local`.

Run:
```powershell
git check-ignore -v .env.local
```
Expected: imprime a regra do `.gitignore` que casa. Se não imprimir nada, o arquivo **não** está ignorado — corrigir antes de seguir.

- [ ] **Step 4: Criar o rewrite de SPA para a Hostinger**

Create `public/.htaccess`:
```apache
# SPA: qualquer rota que nao seja um arquivo real cai no index.html.
# Sem isso, atualizar a pagina em /caixa retorna 404 na Hostinger.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Tudo que está em `public/` é copiado para `dist/` no build.

- [ ] **Step 5: Confirmar que o `.htaccess` chega ao build**

Run:
```powershell
npm run build
Test-Path dist/.htaccess
```
Expected: `True`.

- [ ] **Step 6: Commitar**

```powershell
git add -A
git commit -m "chore: contrato de env e rewrite de SPA para a Hostinger"
```

---

## Entrega da Fase 0

Ao final das 5 tasks:

- `npm run dev` → app roda com a identidade Autchronos aplicada
- `npm test` → 6 testes passando
- `npm run build` → `dist/` pronto para subir na Hostinger, com `.htaccess`
- Tema claro/escuro funcionando e persistindo
- Nenhuma cor crua no código — só tokens semânticos
- Zero código de negócio (Fase 1 começa limpa)
