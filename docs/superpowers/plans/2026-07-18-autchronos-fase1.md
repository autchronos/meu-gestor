# Autchronos Fase 1 (Setup + Landing + PWA) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a landing page pública do Autchronos em Next.js 14, no design system "Institucional Clássico" (claro por padrão, com tema escuro opcional), instalável como PWA no celular — sem banco e sem login.

**Architecture:** App Router com componentes de UI pequenos e reutilizáveis em `src/components`, lógica pura em `src/lib` (testada), hooks React em `src/hooks`. Cores como tokens semânticos via CSS variables trocadas pela classe `.dark`. PWA via Serwist (`@serwist/next`) com manifest pela rota de metadata do App Router e ícones gerados das logos entregues.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS 3 · Serwist 9 · Vitest + Testing Library · next/font (Lora + Inter) · sharp (geração de ícones).

## Global Constraints

- **Idioma:** interface 100% português do Brasil; `<html lang="pt-BR">`.
- **Moeda:** R$ no formato brasileiro `1.234,56` (ponto de milhar, vírgula decimal).
- **Nome/tagline (verbatim):** "Autchronos — Meu Gestor Financeiro".
- **Tema:** CLARO é o padrão; escuro é opcional (classe `.dark`), persistido em `localStorage` sob a chave `tema` (`"claro"` | `"escuro"`), sem flash na primeira pintura.
- **Regra de cor (inquebrável):** a cor da marca (azul-marinho) nunca representa dinheiro. Verde (`entrada`) e vinho (`saida`) são exclusivos de valores. Dourado é acento (ícone/saldo), nunca texto de corpo; quando texto, só sobre superfície azul-marinho.
- **Tokens de cor (claro / escuro):** `fundo` `#F7F8FA`/`#0A1524` · `superficie` `#FFFFFF`/`#10203A` · `borda` `#E3E7ED`/`#1E3350` · `texto` `#1A2433`/`#E6ECF5` · `texto-suave` `#5A6675`/`#9FB0C4` · `marca` `#0A2540`/`#3E6DA6` · `dourado` `#C9A227`/`#D9B84A` · `entrada` `#1B7A4B`/`#3FA76A` · `saida` `#9B2335`/`#C85462`.
- **Tipografia:** serif **Lora** só no logotipo e nos números do saldo; **Inter** em todo o resto.
- **Alias:** `@/*` → `./src/*`.
- **Fonte de verdade preservada:** não apagar `supabase/`, `PLANO-DE-ACAO-APP-MEI.txt` nem `docs/`. Não restaurar o código Vite antigo.

---

## Estrutura de arquivos (Fase 1)

```
package.json, tsconfig.json, next.config.mjs, postcss.config.mjs,
tailwind.config.ts, vitest.config.ts, .gitignore, README.md, next-env.d.ts
scripts/gerar-icones.mjs            # gera ícones do PWA a partir da logo
public/logo.png                     # logo oficial (com nome)  [copiada]
public/logo-icone.png               # só o ícone               [copiada]
public/icons/icon-192.png, icon-512.png, icon-maskable-512.png  [geradas]
src/app/layout.tsx                  # <html lang=pt-BR>, fontes, script anti-flash
src/app/globals.css                 # @tailwind + CSS vars (claro/.dark)
src/app/page.tsx                    # landing (monta as seções)
src/app/entrar/page.tsx             # stub "em breve" (Fase 2)
src/app/manifest.ts                 # MetadataRoute.Manifest
src/app/sw.ts                       # service worker (Serwist)
src/lib/formato.ts                  # formatarBRL
src/lib/instalacao.ts              # ehIOS, estaEmModoStandalone
src/hooks/useInstallPrompt.ts       # captura beforeinstallprompt
src/hooks/useTema.ts                # tema claro/escuro
src/components/ToggleTema.tsx
src/components/Header.tsx
src/components/Hero.tsx              # inclui MockupApp
src/components/SecaoRecursos.tsx
src/components/SecaoComoFunciona.tsx
src/components/BotaoInstalar.tsx
src/components/Footer.tsx
tests/setup.ts, tests/formato.test.ts, tests/instalacao.test.ts,
tests/useInstallPrompt.test.tsx, tests/useTema.test.tsx, tests/landing.test.tsx
```

---

### Task 1: Scaffold do projeto Next.js + Tailwind + tokens + fontes + Vitest

**Files:**
- Restore (do HEAD, manter): `supabase/`, `PLANO-DE-ACAO-APP-MEI.txt`, `docs/`
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `.gitignore`, `README.md`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Copy: `logo oficial.png` → `public/logo.png`; `logo sem o nome.png` → `public/logo-icone.png`
- Test: `tests/setup.ts`, `tests/smoke.test.tsx`

**Interfaces:**
- Produces: página `/` mínima renderizável; classes utilitárias de token (`bg-fundo`, `text-marca`, `font-serif`, `font-sans` etc.); alias `@/` funcionando em app e testes.

- [ ] **Step 1: Preservar a fonte de verdade e criar `.gitignore`**

O working tree tem os arquivos Vite antigos deletados (recuperáveis no HEAD). Restaure só o que é fonte de verdade e crie o `.gitignore` novo.

Run:
```bash
git checkout HEAD -- supabase "PLANO-DE-ACAO-APP-MEI.txt" docs
```

Create `.gitignore`:
```gitignore
node_modules
.next
out
build
coverage
*.tsbuildinfo
next-env.d.ts
.env*.local
.DS_Store
# PWA (gerados por build)
public/sw.js
public/sw.js.map
public/swe-worker-*.js
public/workbox-*.js
```

- [ ] **Step 2: Criar `package.json` e instalar dependências**

Create `package.json`:
```json
{
  "name": "autchronos",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "icons": "node scripts/gerar-icones.mjs"
  }
}
```

Run (na raiz do projeto):
```bash
npm install next@14 react@18 react-dom@18
npm install -D typescript @types/node @types/react @types/react-dom \
  tailwindcss@3 postcss autoprefixer \
  vitest @vitejs/plugin-react vite-tsconfig-paths jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: instala sem erros; `node_modules/` criado.

- [ ] **Step 3: Criar as configs (`tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`)**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

Create `postcss.config.mjs`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

Create `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fundo: "var(--cor-fundo)",
        superficie: "var(--cor-superficie)",
        borda: "var(--cor-borda)",
        texto: "var(--cor-texto)",
        "texto-suave": "var(--cor-texto-suave)",
        marca: "var(--cor-marca)",
        dourado: "var(--cor-dourado)",
        entrada: "var(--cor-entrada)",
        saida: "var(--cor-saida)",
      },
      fontFamily: {
        serif: ["var(--fonte-serif)", "serif"],
        sans: ["var(--fonte-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 4: Copiar as logos para `public/`**

Run:
```bash
mkdir -p public
cp "logo oficial.png" public/logo.png
cp "logo sem o nome.png" public/logo-icone.png
```

- [ ] **Step 5: Criar `globals.css` com os tokens (claro + `.dark`)**

Create `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --cor-fundo: #F7F8FA;
  --cor-superficie: #FFFFFF;
  --cor-borda: #E3E7ED;
  --cor-texto: #1A2433;
  --cor-texto-suave: #5A6675;
  --cor-marca: #0A2540;
  --cor-dourado: #C9A227;
  --cor-entrada: #1B7A4B;
  --cor-saida: #9B2335;
}

.dark {
  --cor-fundo: #0A1524;
  --cor-superficie: #10203A;
  --cor-borda: #1E3350;
  --cor-texto: #E6ECF5;
  --cor-texto-suave: #9FB0C4;
  --cor-marca: #3E6DA6;
  --cor-dourado: #D9B84A;
  --cor-entrada: #3FA76A;
  --cor-saida: #C85462;
}

body {
  background-color: var(--cor-fundo);
  color: var(--cor-texto);
}
```

- [ ] **Step 6: Criar `layout.tsx` e `page.tsx` mínimos**

Create `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--fonte-serif" });

export const metadata: Metadata = {
  title: "Autchronos — Meu Gestor Financeiro",
  description: "Gestão financeira e fluxo de caixa para micro-empreendedores.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="font-serif text-2xl font-bold text-marca">Autchronos</h1>
    </main>
  );
}
```

- [ ] **Step 7: Escrever o teste de fumaça (falha primeiro)**

Create `tests/setup.ts`:
```ts
import "@testing-library/jest-dom";
```

Create `tests/smoke.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

test("a home renderiza o nome da marca", () => {
  render(<Home />);
  expect(screen.getByText("Autchronos")).toBeInTheDocument();
});
```

Run: `npm test`
Expected no início: pode FALHAR se algum passo anterior faltou; o objetivo é ver o teste rodar.

- [ ] **Step 8: Rodar o teste e o build para verificar verde**

Run: `npm test`
Expected: PASS (1 teste).

Run: `npm run build`
Expected: build conclui sem erros (compila `/` e o layout).

- [ ] **Step 9: Criar README mínimo e commitar**

Create `README.md`:
```markdown
# Autchronos — Meu Gestor Financeiro

Gestão financeira e fluxo de caixa para micro-empreendedores brasileiros.
PWA em Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.

## Rodar em desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes (Vitest)
npm run build    # build de produção
```

Fase atual: 1 (landing pública + PWA). Auth, dashboard, estoque e WhatsApp
chegam nas próximas fases.
```

Run:
```bash
git add -A
git commit -m "feat: scaffold Next.js 14 + Tailwind (tokens institucionais) + Vitest"
```
Expected: commit registra os arquivos novos do Next e remove os arquivos Vite antigos que já estavam deletados no working tree.

---

### Task 2: Utilitário `formatarBRL`

**Files:**
- Create: `src/lib/formato.ts`
- Test: `tests/formato.test.ts`

**Interfaces:**
- Produces: `formatarBRL(valor: number): string` → `"R$ 1.234,56"` (espaço comum, não NBSP).

- [ ] **Step 1: Escrever o teste (falha primeiro)**

Create `tests/formato.test.ts`:
```ts
import { formatarBRL } from "@/lib/formato";

test("formata valor positivo no padrão brasileiro", () => {
  expect(formatarBRL(1234.56)).toBe("R$ 1.234,56");
});

test("formata valor negativo (saída)", () => {
  expect(formatarBRL(-200)).toBe("-R$ 200,00");
});

test("formata zero", () => {
  expect(formatarBRL(0)).toBe("R$ 0,00");
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- formato`
Expected: FAIL com "Cannot find module '@/lib/formato'".

- [ ] **Step 3: Implementar**

Create `src/lib/formato.ts`:
```ts
// Intl insere um espaço NBSP (U+00A0) entre "R$" e o número; normalizamos para
// espaço comum para que a UI e os testes sejam previsíveis.
export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(valor)
    .replace(/\u00A0/g, " ");
}
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- formato`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/formato.ts tests/formato.test.ts
git commit -m "feat: formatarBRL (R$ no padrão brasileiro)"
```

---

### Task 3: Detecção de instalação + hook `useInstallPrompt`

**Files:**
- Create: `src/lib/instalacao.ts`, `src/hooks/useInstallPrompt.ts`
- Test: `tests/instalacao.test.ts`, `tests/useInstallPrompt.test.tsx`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces:
  - `ehIOS(userAgent: string): boolean`
  - `estaEmModoStandalone(): boolean`
  - `useInstallPrompt(): { podeInstalar: boolean; instalar: () => Promise<void>; instalado: boolean }`

- [ ] **Step 1: Escrever os testes das funções puras (falha primeiro)**

Create `tests/instalacao.test.ts`:
```ts
import { ehIOS } from "@/lib/instalacao";

test("detecta iPhone", () => {
  expect(ehIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
});

test("detecta iPad", () => {
  expect(ehIOS("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
});

test("Android não é iOS", () => {
  expect(ehIOS("Mozilla/5.0 (Linux; Android 13)")).toBe(false);
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- instalacao`
Expected: FAIL com "Cannot find module '@/lib/instalacao'".

- [ ] **Step 3: Implementar `instalacao.ts`**

Create `src/lib/instalacao.ts`:
```ts
export function ehIOS(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function estaEmModoStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const porMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return porMedia || iosStandalone;
}
```

- [ ] **Step 4: Rodar para confirmar verde das puras**

Run: `npm test -- instalacao`
Expected: PASS (3 testes).

- [ ] **Step 5: Escrever o teste do hook (falha primeiro)**

Create `tests/useInstallPrompt.test.tsx`:
```tsx
import { act, renderHook } from "@testing-library/react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

function dispararBeforeInstallPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const evento = new Event("beforeinstallprompt") as Event & {
    prompt: typeof prompt;
    userChoice: Promise<{ outcome: string }>;
  };
  evento.prompt = prompt;
  evento.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => {
    window.dispatchEvent(evento);
  });
  return prompt;
}

test("podeInstalar fica true após o evento e instalar() chama prompt", async () => {
  const { result } = renderHook(() => useInstallPrompt());
  expect(result.current.podeInstalar).toBe(false);

  const prompt = dispararBeforeInstallPrompt();
  expect(result.current.podeInstalar).toBe(true);

  await act(async () => {
    await result.current.instalar();
  });
  expect(prompt).toHaveBeenCalledOnce();
  expect(result.current.podeInstalar).toBe(false);
});
```

- [ ] **Step 6: Rodar para confirmar a falha**

Run: `npm test -- useInstallPrompt`
Expected: FAIL com "Cannot find module '@/hooks/useInstallPrompt'".

- [ ] **Step 7: Implementar o hook**

Create `src/hooks/useInstallPrompt.ts`:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { estaEmModoStandalone } from "@/lib/instalacao";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    setInstalado(estaEmModoStandalone());

    function aoDisparar(e: Event) {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    }
    function aoInstalar() {
      setInstalado(true);
      setEvento(null);
    }

    window.addEventListener("beforeinstallprompt", aoDisparar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoDisparar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }, [evento]);

  return { podeInstalar: evento !== null && !instalado, instalar, instalado };
}
```

- [ ] **Step 8: Rodar para confirmar verde**

Run: `npm test -- useInstallPrompt`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/instalacao.ts src/hooks/useInstallPrompt.ts tests/instalacao.test.ts tests/useInstallPrompt.test.tsx
git commit -m "feat: detecção de instalação (iOS/standalone) e useInstallPrompt"
```

---

### Task 4: Tema claro/escuro (hook + toggle + anti-flash)

**Files:**
- Create: `src/hooks/useTema.ts`, `src/components/ToggleTema.tsx`
- Modify: `src/app/layout.tsx` (script anti-flash + `suppressHydrationWarning`)
- Test: `tests/useTema.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `lerTemaInicial(): "claro" | "escuro"`
  - `useTema(): { tema: "claro" | "escuro"; alternar: () => void }`
  - `<ToggleTema />` (client component)

- [ ] **Step 1: Escrever o teste do hook (falha primeiro)**

Create `tests/useTema.test.tsx`:
```tsx
import { act, renderHook } from "@testing-library/react";
import { useTema } from "@/hooks/useTema";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

test("começa no claro e alterna para escuro aplicando a classe e persistindo", () => {
  const { result } = renderHook(() => useTema());
  expect(result.current.tema).toBe("claro");

  act(() => result.current.alternar());

  expect(result.current.tema).toBe("escuro");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("tema")).toBe("escuro");
});

test("lê o tema salvo do localStorage", () => {
  localStorage.setItem("tema", "escuro");
  const { result } = renderHook(() => useTema());
  expect(result.current.tema).toBe("escuro");
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npm test -- useTema`
Expected: FAIL com "Cannot find module '@/hooks/useTema'".

- [ ] **Step 3: Implementar `useTema.ts`**

Create `src/hooks/useTema.ts`:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";

export type Tema = "claro" | "escuro";

export function lerTemaInicial(): Tema {
  if (typeof window === "undefined") return "claro";
  return window.localStorage.getItem("tema") === "escuro" ? "escuro" : "claro";
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
    window.localStorage.setItem("tema", tema);
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((t) => (t === "claro" ? "escuro" : "claro"));
  }, []);

  return { tema, alternar };
}
```

- [ ] **Step 4: Rodar para confirmar verde**

Run: `npm test -- useTema`
Expected: PASS (2 testes).

- [ ] **Step 5: Implementar `ToggleTema.tsx`**

Create `src/components/ToggleTema.tsx`:
```tsx
"use client";
import { useTema } from "@/hooks/useTema";

export function ToggleTema() {
  const { tema, alternar } = useTema();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "claro" ? "Ativar tema escuro" : "Ativar tema claro"}
      className="rounded-md border border-borda p-2 text-texto-suave transition-colors hover:text-texto"
    >
      {tema === "claro" ? "🌙" : "☀️"}
    </button>
  );
}
```

- [ ] **Step 6: Adicionar o script anti-flash no `layout.tsx`**

Modify `src/app/layout.tsx` — substitua o arquivo inteiro por:
```tsx
import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--fonte-serif" });

export const metadata: Metadata = {
  title: "Autchronos — Meu Gestor Financeiro",
  description: "Gestão financeira e fluxo de caixa para micro-empreendedores.",
};

const scriptTema = `try{if(localStorage.getItem('tema')==='escuro'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Rodar testes e build**

Run: `npm test`
Expected: PASS (todos os testes até aqui).

Run: `npm run build`
Expected: build sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useTema.ts src/components/ToggleTema.tsx src/app/layout.tsx tests/useTema.test.tsx
git commit -m "feat: tema claro/escuro com toggle e anti-flash"
```

---

### Task 5: PWA — manifest, Serwist e ícones

**Files:**
- Create: `src/app/manifest.ts`, `src/app/sw.ts`, `scripts/gerar-icones.mjs`
- Modify: `next.config.mjs` (wrapper Serwist)
- Create (geradas): `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`

**Interfaces:**
- Consumes: `public/logo-icone.png` (Task 1).
- Produces: rota `/manifest.webmanifest`; `public/sw.js` no build; ícones do PWA.

- [ ] **Step 1: Instalar Serwist e sharp**

Run:
```bash
npm install @serwist/next@9 serwist@9
npm install -D sharp
```

- [ ] **Step 2: Criar o script de ícones e gerá-los**

Create `scripts/gerar-icones.mjs`:
```js
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const ORIGEM = "public/logo-icone.png";
const DESTINO = "public/icons";
const MARCA = "#0A2540";
const FUNDO_CLARO = "#F7F8FA";

await mkdir(DESTINO, { recursive: true });

async function iconePadrao(tamanho, arquivo) {
  await sharp(ORIGEM)
    .resize(tamanho, tamanho, { fit: "contain", background: FUNDO_CLARO })
    .png()
    .toFile(`${DESTINO}/${arquivo}`);
}

async function iconeMaskable(tamanho, arquivo) {
  const interno = Math.round(tamanho * 0.7); // área de segurança
  const logo = await sharp(ORIGEM)
    .resize(interno, interno, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: MARCA },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${DESTINO}/${arquivo}`);
}

await iconePadrao(192, "icon-192.png");
await iconePadrao(512, "icon-512.png");
await iconeMaskable(512, "icon-maskable-512.png");
console.log("Ícones gerados em", DESTINO);
```

Run:
```bash
npm run icons
```
Expected: imprime "Ícones gerados em public/icons" e cria os 3 PNGs.

- [ ] **Step 3: Criar `manifest.ts`**

Create `src/app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Autchronos — Meu Gestor Financeiro",
    short_name: "Autchronos",
    description: "Gestão financeira e fluxo de caixa para micro-empreendedores.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#0A2540",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 4: Criar o service worker `sw.ts`**

Create `src/app/sw.ts`:
```ts
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

- [ ] **Step 5: Envolver o `next.config.mjs` com Serwist**

Modify `next.config.mjs` — substitua o arquivo inteiro por:
```js
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSerwist(nextConfig);
```

- [ ] **Step 6: Buildar e verificar os artefatos do PWA**

Run: `npm run build`
Expected: build conclui; gera `public/sw.js`.

Run:
```bash
ls public/sw.js public/icons/
```
Expected: `public/sw.js` existe e `public/icons/` tem os 3 PNGs.

Nota de verificação manual (não bloqueia o commit): `npm run start`, abrir
`http://localhost:3000/manifest.webmanifest` deve retornar o JSON do manifest;
no DevTools → Application → Manifest, o app aparece instalável.

- [ ] **Step 7: Commit**

```bash
git add next.config.mjs src/app/manifest.ts src/app/sw.ts scripts/gerar-icones.mjs public/icons
git commit -m "feat: PWA instalável (manifest + Serwist + ícones)"
```

---

### Task 6: Landing page (componentes + montagem) e stub `/entrar`

**Files:**
- Create: `src/components/Header.tsx`, `src/components/Hero.tsx`, `src/components/SecaoRecursos.tsx`, `src/components/SecaoComoFunciona.tsx`, `src/components/BotaoInstalar.tsx`, `src/components/Footer.tsx`
- Modify: `src/app/page.tsx` (monta a landing)
- Create: `src/app/entrar/page.tsx`
- Create: `tests/landing.test.tsx`; Delete: `tests/smoke.test.tsx`

**Interfaces:**
- Consumes: `formatarBRL` (Task 2), `useInstallPrompt` + `ehIOS` (Task 3), `ToggleTema` (Task 4).
- Produces: rota `/` (landing completa) e `/entrar` (stub).

- [ ] **Step 1: Criar `BotaoInstalar.tsx`**

Create `src/components/BotaoInstalar.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { ehIOS } from "@/lib/instalacao";

export function BotaoInstalar() {
  const { podeInstalar, instalar, instalado } = useInstallPrompt();
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);

  if (instalado) return null;

  async function aoClicar() {
    if (podeInstalar) {
      await instalar();
      return;
    }
    setMostrarInstrucoes(true);
  }

  const ios =
    typeof navigator !== "undefined" && ehIOS(navigator.userAgent);

  return (
    <div>
      <button
        type="button"
        onClick={aoClicar}
        className="rounded-md border-2 border-dourado px-5 py-3 font-semibold text-marca transition-colors hover:bg-dourado/10 dark:text-texto"
      >
        📲 Baixar no celular
      </button>
      {mostrarInstrucoes && (
        <p className="mt-3 max-w-xs text-sm text-texto-suave">
          {ios
            ? "Toque no botão Compartilhar do Safari e escolha “Adicionar à Tela de Início”."
            : "No menu do navegador, escolha “Instalar app” ou “Adicionar à tela inicial”."}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar `Header.tsx`**

Create `src/components/Header.tsx`:
```tsx
import Image from "next/image";
import Link from "next/link";
import { ToggleTema } from "@/components/ToggleTema";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-fundo">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-icone.png" alt="Autchronos" width={36} height={36} priority />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-lg font-bold text-marca">Autchronos</span>
            <span className="text-[11px] text-texto-suave">Meu Gestor Financeiro</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-texto-suave md:flex">
          <a href="#recursos" className="hover:text-texto">Recursos</a>
          <a href="#como-funciona" className="hover:text-texto">Como funciona</a>
        </nav>
        <div className="flex items-center gap-2">
          <ToggleTema />
          <Link
            href="/entrar"
            className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Entrar / Cadastrar
          </Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Criar `Hero.tsx` (com o mockup do app)**

Create `src/components/Hero.tsx`:
```tsx
import Link from "next/link";
import { formatarBRL } from "@/lib/formato";
import { BotaoInstalar } from "@/components/BotaoInstalar";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
      <div>
        <h1 className="font-serif text-4xl font-bold leading-tight text-marca md:text-5xl">
          Autchronos
        </h1>
        <p className="mt-1 font-serif text-xl text-texto-suave">
          Meu Gestor Financeiro
        </p>
        <p className="mt-6 text-lg text-texto">
          Controle o dinheiro do seu negócio com a seriedade de um banco e a
          simplicidade de uma conversa no WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/entrar"
            className="rounded-md bg-marca px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Entrar / Cadastrar
          </Link>
          <div className="md:hidden">
            <BotaoInstalar />
          </div>
        </div>
      </div>
      <MockupApp />
    </section>
  );
}

function MockupApp() {
  return (
    <div className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm">
      <div className="bg-marca p-5 text-white">
        <p className="text-sm opacity-80">Saldo em caixa</p>
        <p className="font-serif text-3xl font-bold text-dourado">
          {formatarBRL(4235.9)}
        </p>
      </div>
      <ul className="divide-y divide-borda p-5 text-sm">
        <li className="flex justify-between py-2">
          <span>Venda de açaí</span>
          <span className="text-entrada">+{formatarBRL(45)}</span>
        </li>
        <li className="flex justify-between py-2">
          <span>Fornecedor</span>
          <span className="text-saida">-{formatarBRL(200)}</span>
        </li>
        <li className="flex justify-between py-2">
          <span>Aluguel recebido</span>
          <span className="text-entrada">+{formatarBRL(800)}</span>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Criar `SecaoRecursos.tsx`**

Create `src/components/SecaoRecursos.tsx`:
```tsx
const RECURSOS = [
  {
    titulo: "Separe empresa e pessoal",
    texto:
      "Cada lançamento numa carteira. Retiradas de pró-labore com limite e alerta — pare de misturar seu dinheiro com o do negócio.",
  },
  {
    titulo: "Saldo real, não aparente",
    texto:
      "Saiba o que já caiu (“Disponível hoje”) e o que ainda vai cair (“A receber”), com fiado e taxas de cartão já descontadas.",
  },
  {
    titulo: "Lançamentos pelo WhatsApp",
    texto:
      "Mande “vendi 3 açaí 45” e o app registra a entrada sozinho, com baixa no estoque.",
  },
  {
    titulo: "Estoque por nicho",
    texto:
      "Produtos, ingredientes ou itens de locação — o controle se adapta ao seu negócio.",
  },
];

export function SecaoRecursos() {
  return (
    <section id="recursos" className="border-t border-borda bg-superficie">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-marca">Recursos</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {RECURSOS.map((r) => (
            <div key={r.titulo} className="rounded-lg border border-borda p-6">
              <h3 className="text-lg font-semibold text-texto">{r.titulo}</h3>
              <p className="mt-2 text-texto-suave">{r.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Criar `SecaoComoFunciona.tsx`**

Create `src/components/SecaoComoFunciona.tsx`:
```tsx
const PASSOS = [
  { n: 1, titulo: "Crie sua conta", texto: "Cadastre o negócio e escolha o seu nicho em menos de um minuto." },
  { n: 2, titulo: "Conecte o WhatsApp", texto: "Ligue seu número e passe a lançar vendas por mensagem." },
  { n: 3, titulo: "Acompanhe o caixa", texto: "Veja saldo, relatórios e estoque atualizados em tempo real." },
];

export function SecaoComoFunciona() {
  return (
    <section id="como-funciona" className="border-t border-borda">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-marca">Como funciona</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {PASSOS.map((p) => (
            <li key={p.n} className="rounded-lg border border-borda bg-superficie p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marca font-serif text-lg font-bold text-dourado">
                {p.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-texto">{p.titulo}</h3>
              <p className="mt-2 text-texto-suave">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Criar `Footer.tsx`**

Create `src/components/Footer.tsx`:
```tsx
export function Footer() {
  return (
    <footer className="border-t border-borda">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-texto-suave">
        <p className="font-serif font-semibold text-marca">Autchronos — Meu Gestor Financeiro</p>
        <p className="mt-1">Gestão financeira para micro-empreendedores brasileiros.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Criar o stub `/entrar`**

Create `src/app/entrar/page.tsx`:
```tsx
import Link from "next/link";

export default function Entrar() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-serif text-2xl font-bold text-marca">Entrar / Cadastrar</h1>
      <p className="text-texto-suave">Área de acesso em breve — chega na Fase 2.</p>
      <Link href="/" className="text-marca underline">
        Voltar para o início
      </Link>
    </main>
  );
}
```

- [ ] **Step 8: Montar a landing em `page.tsx` e escrever o teste**

Modify `src/app/page.tsx` — substitua o arquivo inteiro por:
```tsx
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SecaoRecursos } from "@/components/SecaoRecursos";
import { SecaoComoFunciona } from "@/components/SecaoComoFunciona";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SecaoRecursos />
        <SecaoComoFunciona />
      </main>
      <Footer />
    </>
  );
}
```

Delete `tests/smoke.test.tsx` e crie `tests/landing.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

test("mostra a chamada Entrar / Cadastrar", () => {
  render(<Home />);
  expect(screen.getAllByText(/Entrar \/ Cadastrar/i).length).toBeGreaterThan(0);
});

test("mostra os títulos das seções principais", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /Recursos/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Como funciona/i })).toBeInTheDocument();
});

test("mostra o saldo do mockup formatado em R$", () => {
  render(<Home />);
  expect(screen.getByText("R$ 4.235,90")).toBeInTheDocument();
});
```

Run: `rm tests/smoke.test.tsx`

- [ ] **Step 9: Rodar os testes**

Run: `npm test`
Expected: PASS (todos, incluindo os 3 novos da landing).

- [ ] **Step 10: Build e verificação manual**

Run: `npm run build`
Expected: build sem erros; compila `/` e `/entrar`.

Verificação manual (não bloqueia commit): `npm run dev`, abrir
`http://localhost:3000` — a landing aparece clara (institucional), o toggle
alterna claro/escuro sem flash, e no responsivo (largura de celular) o botão
"📲 Baixar no celular" aparece no hero.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: landing institucional (header, hero, recursos, como funciona, footer) + stub /entrar"
```

---

## Self-Review (cobertura da spec)

- **Setup Next.js 14 + TS + Tailwind + `@/` + pt-BR** → Task 1. ✓
- **Tokens semânticos (claro/escuro) + fontes Lora/Inter** → Task 1 (globals.css, tailwind.config, layout). ✓
- **Tema claro padrão + escuro opcional, anti-flash, persistência** → Task 4. ✓
- **formatarBRL (R$ 1.234,56)** → Task 2. ✓
- **Landing: header, hero+mockup, recursos, como funciona (3 passos), footer, botão Entrar/Cadastrar** → Task 6. ✓
- **Botão "📲 Baixar no celular" com beforeinstallprompt + fallback iOS** → Task 3 (hook/lib) + Task 6 (BotaoInstalar). ✓
- **PWA: manifest, service worker, ícones (192/512 + maskable), instalável** → Task 5. ✓
- **Stub /entrar (auth é Fase 2)** → Task 6. ✓
- **Regra de cor (marca ≠ dinheiro; dourado só acento/saldo sobre navy)** → mockup do Hero usa dourado sobre faixa `bg-marca`; entrada/saída em verde/vinho. ✓
- **Fonte de verdade preservada (supabase/, PLANO, docs/)** → Task 1 Step 1. ✓
- **Testes fortes (puros + hooks + render)** → Tasks 2–6. ✓

Fora de escopo desta fase (correto): auth, onboarding, dashboard, estoque, WhatsApp, qualquer acesso a banco.
