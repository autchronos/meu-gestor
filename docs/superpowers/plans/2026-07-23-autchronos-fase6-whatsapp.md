# Fase 6 — WhatsApp via uazapi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o MEI registre entrada/saída e consulte saldo e estoque pelo WhatsApp, por comandos rígidos, sem login, com o número de quem envia identificando o negócio.

**Architecture:** Um número central (instância uazapi) recebe as mensagens; um webhook Next.js (`/api/whatsapp`) autentica por segredo, normaliza a mensagem num adapter anticorrupção, interpreta o comando com um parser puro, resolve o negócio pelo telefone verificado (service_role, `negocio_id` explícito), executa reusando os módulos de domínio e responde. A vinculação do número usa código gerado no `/painel` + link `wa.me`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (service_role no webhook, RLS no app), Vitest. Sem IA. Provedor WhatsApp: uazapi (uazapiGO v2).

## Global Constraints

- Isolamento **sempre por `negocio_id`**, nunca `user_id`. No webhook (service_role, ignora RLS) todo acesso filtra `negocio_id` explicitamente.
- Tudo em **pt-BR**. Dinheiro via `formatarBRL` de `@/lib/formato`; **cor da marca (navy) nunca toca dinheiro** (não se aplica aqui — sem UI de dinheiro, mas mantém o princípio no app).
- Datas em fuso **America/Sao_Paulo** via `hojeSP()` de `@/lib/caixa/periodo`.
- Testes ficam em `tests/<nome>.test.ts` (raiz), estilo `test("...", () => { expect(...) })`, import via alias `@/`. Rodar com `npm test` (`vitest run`).
- `service_role` (`criarClienteAdmin` de `@/lib/supabase/admin`) **só** em código server-only (webhook). Nunca em client component.
- Migrations aplicadas pelo **usuário** no SQL Editor do Supabase Cloud (produção). O guardião `npm run verificar:rls` precisa continuar verde.
- Webhook retorna **200 sempre**, exceto segredo inválido → **401**, para não disparar loop de retry da uazapi.
- Idempotência: lançamentos do WhatsApp usam `origem='whatsapp'` + `origem_msg_id` (UNIQUE `(negocio_id, origem_msg_id)` já existe na 0001).
- Env vars novas: `UAZAPI_URL`, `UAZAPI_TOKEN`, `UAZAPI_WEBHOOK_SECRET`, `UAZAPI_NUMERO_BOT`.

---

## File Structure

**Criar:**
- `src/lib/whatsapp/comandos.ts` — parser puro `interpretar(texto)` + `parseValor`.
- `src/lib/whatsapp/respostas.ts` — formatadores puros das respostas do bot.
- `src/lib/whatsapp/uazapi.ts` — adapter: `extrairMensagem` (puro) + `enviarTexto` (rede).
- `src/lib/whatsapp/verificacao.ts` — `gerarCodigoNumerico` (puro) + `consumirCodigo` (DB, service_role).
- `src/lib/whatsapp/executor.ts` — `resolverNegocioPorTelefone` + `executarComando` (DB, service_role).
- `src/app/api/whatsapp/route.ts` — webhook (orquestração fina).
- `src/app/painel/configuracoes/ConectarWhatsApp.tsx` — UI client.
- `supabase/migrations/0013_whatsapp.sql` — tabela `whatsapp_verificacoes` + RLS.
- `tests/whatsapp-comandos.test.ts`, `tests/whatsapp-respostas.test.ts`, `tests/whatsapp-uazapi.test.ts`, `tests/whatsapp-verificacao.test.ts`.

**Modificar:**
- `src/app/painel/configuracoes/acoes.ts` — nova server action `conectarWhatsApp()`.
- `src/app/painel/configuracoes/page.tsx` — montar `<ConectarWhatsApp>` com status + número sugerido.
- `.env.local.example` — adicionar as 4 env vars.

---

### Task 1: Parser de comandos

**Files:**
- Create: `src/lib/whatsapp/comandos.ts`
- Test: `tests/whatsapp-comandos.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Comando = { tipo: "entrada"; valor: number; descricao: string } | { tipo: "saida"; valor: number; descricao: string } | { tipo: "consulta_saldo" } | { tipo: "consulta_estoque"; filtro: string | null } | { tipo: "verificacao"; codigo: string } | { tipo: "ajuda" }`
  - `function interpretar(texto: string): Comando`
  - `function parseValor(s: string): number` (retorna `NaN` se não parsear)

- [ ] **Step 1: Write the failing test**

```ts
// tests/whatsapp-comandos.test.ts
import { interpretar, parseValor } from "@/lib/whatsapp/comandos";

test("parseValor entende vírgula decimal e R$", () => {
  expect(parseValor("50")).toBe(50);
  expect(parseValor("50,50")).toBe(50.5);
  expect(parseValor("R$ 15,90")).toBe(15.9);
  expect(parseValor("1.234,56")).toBe(1234.56);
  expect(Number.isNaN(parseValor("abc"))).toBe(true);
});

test("entrada por símbolo e por extenso", () => {
  expect(interpretar("+50 bolo")).toEqual({ tipo: "entrada", valor: 50, descricao: "bolo" });
  expect(interpretar("entrada 50 bolo")).toEqual({ tipo: "entrada", valor: 50, descricao: "bolo" });
  expect(interpretar("+120 conserto de geladeira")).toEqual({ tipo: "entrada", valor: 120, descricao: "conserto de geladeira" });
});

test("saída por símbolo e por extenso, com e sem acento", () => {
  expect(interpretar("-30 gasolina")).toEqual({ tipo: "saida", valor: 30, descricao: "gasolina" });
  expect(interpretar("saida 30 gasolina")).toEqual({ tipo: "saida", valor: 30, descricao: "gasolina" });
  expect(interpretar("saída 30 gasolina")).toEqual({ tipo: "saida", valor: 30, descricao: "gasolina" });
});

test("valor com vírgula e sem descrição", () => {
  expect(interpretar("+15,50")).toEqual({ tipo: "entrada", valor: 15.5, descricao: "" });
});

test("valor ausente ou zero vira ajuda", () => {
  expect(interpretar("+0 bolo")).toEqual({ tipo: "ajuda" });
  expect(interpretar("+ bolo")).toEqual({ tipo: "ajuda" });
  expect(interpretar("entrada bolo")).toEqual({ tipo: "ajuda" });
});

test("consulta saldo por saldo/resumo/hoje", () => {
  expect(interpretar("saldo")).toEqual({ tipo: "consulta_saldo" });
  expect(interpretar("RESUMO")).toEqual({ tipo: "consulta_saldo" });
  expect(interpretar(" hoje ")).toEqual({ tipo: "consulta_saldo" });
});

test("consulta estoque com e sem filtro", () => {
  expect(interpretar("estoque")).toEqual({ tipo: "consulta_estoque", filtro: null });
  expect(interpretar("estoque bolo")).toEqual({ tipo: "consulta_estoque", filtro: "bolo" });
});

test("verificação casa código de 4 a 6 dígitos", () => {
  expect(interpretar("AUTCHRONOS 4823")).toEqual({ tipo: "verificacao", codigo: "4823" });
  expect(interpretar("autchronos 123456")).toEqual({ tipo: "verificacao", codigo: "123456" });
});

test("ajuda e texto não reconhecido caem em ajuda", () => {
  expect(interpretar("ajuda")).toEqual({ tipo: "ajuda" });
  expect(interpretar("menu")).toEqual({ tipo: "ajuda" });
  expect(interpretar("oi tudo bem?")).toEqual({ tipo: "ajuda" });
  expect(interpretar("")).toEqual({ tipo: "ajuda" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- whatsapp-comandos`
Expected: FAIL — `Cannot find module '@/lib/whatsapp/comandos'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/whatsapp/comandos.ts
export type Comando =
  | { tipo: "entrada"; valor: number; descricao: string }
  | { tipo: "saida"; valor: number; descricao: string }
  | { tipo: "consulta_saldo" }
  | { tipo: "consulta_estoque"; filtro: string | null }
  | { tipo: "verificacao"; codigo: string }
  | { tipo: "ajuda" };

const AJUDA: Comando = { tipo: "ajuda" };

// Aceita "50", "50,50", "R$ 15,90", "1.234,56". Ponto sozinho = decimal.
export function parseValor(s: string): number {
  let t = s.replace(/r\$/i, "").replace(/\s/g, "");
  if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  if (!/^\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

// Extrai o número no início do resto e o que sobra vira descrição.
function valorEDescricao(resto: string): { valor: number; descricao: string } | null {
  const m = resto.match(/^\s*(r\$)?\s*([\d.,]+)\s*([\s\S]*)$/i);
  if (!m) return null;
  const valor = parseValor(m[2]);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return { valor, descricao: m[3].trim() };
}

export function interpretar(texto: string): Comando {
  const t = (texto ?? "").trim();
  const lower = t.toLowerCase();

  const mVerif = t.match(/^autchronos\s+(\d{4,6})$/i);
  if (mVerif) return { tipo: "verificacao", codigo: mVerif[1] };

  if (lower === "saldo" || lower === "resumo" || lower === "hoje") return { tipo: "consulta_saldo" };

  const mEstoque = lower.match(/^estoque(?:\s+([\s\S]+))?$/);
  if (mEstoque) return { tipo: "consulta_estoque", filtro: mEstoque[1]?.trim() || null };

  if (lower === "ajuda" || lower === "menu") return AJUDA;

  // Entrada/saída por símbolo.
  if (t.startsWith("+") || t.startsWith("-")) {
    const vd = valorEDescricao(t.slice(1));
    if (!vd) return AJUDA;
    return { tipo: t.startsWith("+") ? "entrada" : "saida", valor: vd.valor, descricao: vd.descricao };
  }

  // Entrada/saída por extenso.
  const mPalavra = lower.match(/^(entrada|sa[ií]da)\b/);
  if (mPalavra) {
    const vd = valorEDescricao(t.slice(mPalavra[0].length));
    if (!vd) return AJUDA;
    return { tipo: mPalavra[1].startsWith("entrada") ? "entrada" : "saida", valor: vd.valor, descricao: vd.descricao };
  }

  return AJUDA;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- whatsapp-comandos`
Expected: PASS (todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/comandos.ts tests/whatsapp-comandos.test.ts
git commit -m "feat(whatsapp): parser de comandos rigidos"
```

---

### Task 2: Formatadores de resposta do bot

**Files:**
- Create: `src/lib/whatsapp/respostas.ts`
- Test: `tests/whatsapp-respostas.test.ts`

**Interfaces:**
- Consumes: `formatarBRL` de `@/lib/formato`.
- Produces (todas retornam `string`):
  - `mensagemAjuda(): string`
  - `mensagemRegistrado(tipo: "entrada" | "saida", valor: number, descricao: string, disponivel: number): string`
  - `mensagemSaldo(disponivel: number, entradasHoje: number, saidasHoje: number): string`
  - `mensagemEstoque(itens: { nome: string; estoque: number }[], filtro: string | null): string`
  - `mensagemEstoqueDesativado(): string`
  - `mensagemConectado(nomeNegocio: string): string`
  - `mensagemCodigoInvalido(): string`
  - `mensagemNaoReconhecido(): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/whatsapp-respostas.test.ts
import {
  mensagemAjuda, mensagemRegistrado, mensagemSaldo, mensagemEstoque,
  mensagemEstoqueDesativado, mensagemConectado, mensagemCodigoInvalido, mensagemNaoReconhecido,
} from "@/lib/whatsapp/respostas";

test("registrado mostra tipo, valor, descrição e saldo", () => {
  const s = mensagemRegistrado("entrada", 50, "bolo", 1234.5);
  expect(s).toContain("Entrada");
  expect(s).toContain("bolo");
  expect(s).toContain("R$"); // via formatarBRL
});

test("registrado sem descrição não quebra", () => {
  expect(() => mensagemRegistrado("saida", 30, "", 0)).not.toThrow();
});

test("saldo mostra disponível e movimento do dia", () => {
  const s = mensagemSaldo(1000, 200, 50);
  expect(s.toLowerCase()).toContain("saldo");
});

test("estoque lista itens; vazio dá mensagem própria", () => {
  expect(mensagemEstoque([{ nome: "Bolo", estoque: 8 }], null)).toContain("Bolo");
  expect(mensagemEstoque([], "bolo").toLowerCase()).toContain("nenhum");
});

test("mensagens fixas não são vazias", () => {
  for (const s of [mensagemAjuda(), mensagemEstoqueDesativado(), mensagemConectado("Padaria X"), mensagemCodigoInvalido(), mensagemNaoReconhecido()]) {
    expect(s.length).toBeGreaterThan(0);
  }
  expect(mensagemConectado("Padaria X")).toContain("Padaria X");
});

test("ajuda cita os comandos principais", () => {
  const s = mensagemAjuda().toLowerCase();
  expect(s).toContain("+50");
  expect(s).toContain("saldo");
  expect(s).toContain("estoque");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- whatsapp-respostas`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/whatsapp/respostas.ts
import { formatarBRL } from "@/lib/formato";

export function mensagemAjuda(): string {
  return [
    "🤖 *Autchronos* — comandos:",
    "",
    "➕ Registrar entrada: `+50 bolo` ou `entrada 50 bolo`",
    "➖ Registrar saída: `-30 gasolina` ou `saida 30 gasolina`",
    "💰 Ver saldo: `saldo`",
    "📦 Ver estoque: `estoque` ou `estoque bolo`",
    "❓ Ajuda: `ajuda`",
  ].join("\n");
}

export function mensagemRegistrado(tipo: "entrada" | "saida", valor: number, descricao: string, disponivel: number): string {
  const rotulo = tipo === "entrada" ? "Entrada" : "Saída";
  const emoji = tipo === "entrada" ? "✅" : "🔻";
  const desc = descricao ? ` (${descricao})` : "";
  return `${emoji} ${rotulo} de ${formatarBRL(valor)}${desc} registrada.\n💰 Saldo disponível: ${formatarBRL(disponivel)}`;
}

export function mensagemSaldo(disponivel: number, entradasHoje: number, saidasHoje: number): string {
  return [
    `💰 Saldo disponível: ${formatarBRL(disponivel)}`,
    `📅 Hoje: +${formatarBRL(entradasHoje)} / -${formatarBRL(saidasHoje)}`,
  ].join("\n");
}

export function mensagemEstoque(itens: { nome: string; estoque: number }[], filtro: string | null): string {
  if (!itens.length) {
    return filtro
      ? `📦 Nenhum item com estoque controlado encontrado para "${filtro}".`
      : "📦 Nenhum item com estoque controlado.";
  }
  const linhas = itens.map((i) => `• ${i.nome}: ${i.estoque}`);
  return ["📦 *Estoque*", ...linhas].join("\n");
}

export function mensagemEstoqueDesativado(): string {
  return "📦 Seu negócio não usa controle de estoque. Ative em Configurações se quiser.";
}

export function mensagemConectado(nomeNegocio: string): string {
  return `✅ WhatsApp conectado ao *${nomeNegocio}*! Agora é só mandar seus lançamentos por aqui.`;
}

export function mensagemCodigoInvalido(): string {
  return "❌ Código inválido ou expirado. Gere um novo em Configurações no app.";
}

export function mensagemNaoReconhecido(): string {
  return "👋 Número não reconhecido. Conecte seu WhatsApp no app: meu-gestor-phi.vercel.app (Configurações → Conectar WhatsApp).";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- whatsapp-respostas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/respostas.ts tests/whatsapp-respostas.test.ts
git commit -m "feat(whatsapp): formatadores de resposta do bot"
```

---

### Task 3: Adapter uazapi (extrair mensagem + enviar texto)

**Files:**
- Create: `src/lib/whatsapp/uazapi.ts`
- Test: `tests/whatsapp-uazapi.test.ts`

**Interfaces:**
- Consumes: `process.env.UAZAPI_URL`, `process.env.UAZAPI_TOKEN`.
- Produces:
  - `interface MensagemRecebida { remetente: string; texto: string; messageId: string; fromMe: boolean; isGroup: boolean }`
  - `function extrairMensagem(payload: unknown): MensagemRecebida | null`
  - `async function enviarTexto(numero: string, texto: string): Promise<void>`

> **Nota de campo (importante):** o mapeamento de campos abaixo segue o formato esperado do uazapiGO v2, mas **será confirmado contra um webhook real na Task 8**. `extrairMensagem` é deliberadamente tolerante (lê nomes de campo alternativos e retorna `null` para o que não for mensagem de texto). Se a captura real mostrar nomes diferentes, ajustar **só** este arquivo e seus testes.

- [ ] **Step 1: Write the failing test**

```ts
// tests/whatsapp-uazapi.test.ts
import { extrairMensagem } from "@/lib/whatsapp/uazapi";

const base = {
  message: {
    id: "3EB0ABC",
    fromMe: false,
    isGroup: false,
    sender: "5511999999999@s.whatsapp.net",
    text: "+50 bolo",
  },
};

test("extrai remetente (só dígitos), texto e id de um DM", () => {
  expect(extrairMensagem(base)).toEqual({
    remetente: "5511999999999",
    texto: "+50 bolo",
    messageId: "3EB0ABC",
    fromMe: false,
    isGroup: false,
  });
});

test("marca fromMe e isGroup", () => {
  const g = { message: { ...base.message, isGroup: true, sender: "12345@g.us" } };
  expect(extrairMensagem(g)?.isGroup).toBe(true);
  const meu = { message: { ...base.message, fromMe: true } };
  expect(extrairMensagem(meu)?.fromMe).toBe(true);
});

test("retorna null para payload sem mensagem, sem id ou sem texto", () => {
  expect(extrairMensagem(null)).toBeNull();
  expect(extrairMensagem({})).toBeNull();
  expect(extrairMensagem({ message: { id: "x", sender: "551199@s.whatsapp.net" } })).toBeNull(); // sem texto
  expect(extrairMensagem({ message: { sender: "551199@s.whatsapp.net", text: "oi" } })).toBeNull(); // sem id
});

test("aceita campos alternativos (messageid, content, chatid)", () => {
  const alt = { message: { messageid: "ID2", chatid: "5511888888888@s.whatsapp.net", content: "saldo" } };
  expect(extrairMensagem(alt)).toMatchObject({ remetente: "5511888888888", texto: "saldo", messageId: "ID2" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- whatsapp-uazapi`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/whatsapp/uazapi.ts
export interface MensagemRecebida {
  remetente: string; // só dígitos, ex.: 5511999999999
  texto: string;
  messageId: string;
  fromMe: boolean;
  isGroup: boolean;
}

function digitos(s: unknown): string {
  return typeof s === "string" ? s.replace(/@.*/, "").replace(/\D/g, "") : "";
}

// Tolerante: lê nomes de campo comuns do uazapiGO v2. Retorna null para
// qualquer coisa que não seja uma mensagem de texto processável.
export function extrairMensagem(payload: unknown): MensagemRecebida | null {
  const p = payload as { message?: Record<string, unknown> } | null;
  const m = p?.message;
  if (!m || typeof m !== "object") return null;

  const messageId = (m.id as string) || (m.messageid as string) || "";
  const texto = ((m.text as string) || (m.content as string) || "").trim();
  const bruto = (m.sender as string) || (m.chatid as string) || "";
  const remetente = digitos(bruto);
  if (!messageId || !texto || !remetente) return null;

  const isGroup = m.isGroup === true || String(bruto).endsWith("@g.us");
  const fromMe = m.fromMe === true;
  return { remetente, texto, messageId, fromMe, isGroup };
}

// POST de texto para a uazapi. Loga falha e NÃO lança — o fluxo que chama já
// concluiu (o lançamento foi gravado); não devemos quebrar por falha de envio.
export async function enviarTexto(numero: string, texto: string): Promise<void> {
  try {
    const resp = await fetch(`${process.env.UAZAPI_URL}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: process.env.UAZAPI_TOKEN! },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    if (!resp.ok) console.error("uazapi enviarTexto falhou:", resp.status, await resp.text());
  } catch (e) {
    console.error("uazapi enviarTexto erro:", e);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- whatsapp-uazapi`
Expected: PASS (só `extrairMensagem` é testado; `enviarTexto` é validado na prova viva da Task 8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/uazapi.ts tests/whatsapp-uazapi.test.ts
git commit -m "feat(whatsapp): adapter uazapi (extrair mensagem + enviar texto)"
```

---

### Task 4: Migration 0013 (whatsapp_verificacoes)

**Files:**
- Create: `supabase/migrations/0013_whatsapp.sql`

**Interfaces:**
- Produces: tabela `whatsapp_verificacoes (negocio_id PK, codigo, expira_em, created_at)` com RLS `e_membro`.

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0013_whatsapp.sql
-- Fase 6 — WhatsApp. Codigo temporario para vincular um numero a um negocio.
-- PK por negocio_id: um codigo pendente por negocio (gerar de novo substitui).
CREATE TABLE whatsapp_verificacoes (
  negocio_id UUID PRIMARY KEY REFERENCES negocios(id) ON DELETE CASCADE,
  codigo     TEXT NOT NULL,
  expira_em  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_verificacoes ENABLE ROW LEVEL SECURITY;

-- O app (logado) gera/le/apaga o proprio codigo. O webhook usa service_role,
-- que ignora RLS.
CREATE POLICY whatsapp_verificacoes_all ON whatsapp_verificacoes FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));

-- Nota: a resolucao telefone -> negocio no webhook busca por `telefone`, que ja
-- tem UNIQUE (indexado) desde a 0001 — nao precisa de indice adicional.
```

- [ ] **Step 2: Rodar o guardião de RLS**

Run: `npm run verificar:rls`
Expected: PASS — imprime `ok: whatsapp_verificacoes (RLS + policy)` e `RLS OK (12 tabelas)` (era 11).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_whatsapp.sql
git commit -m "feat(whatsapp): migration 0013 (whatsapp_verificacoes + indice verificado)"
```

- [ ] **Step 4: Aplicar no Cloud (passo manual do usuário)**

O usuário cola o conteúdo de `0013_whatsapp.sql` no SQL Editor do projeto `trpjotkzjttwtyesmqyq` e executa. (Registrar como pendência até a Task 8; nada no app quebra sem isso, mas o webhook e a UI de conexão só funcionam de verdade após aplicar.)

---

### Task 5: Verificação (gerar código puro + consumir no webhook)

**Files:**
- Create: `src/lib/whatsapp/verificacao.ts`
- Test: `tests/whatsapp-verificacao.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` (o cliente admin é injetado pelo chamador), `negocio_telefones`, `whatsapp_verificacoes`, `negocios`.
- Produces:
  - `function gerarCodigoNumerico(): string` (6 dígitos)
  - `async function consumirCodigo(admin: SupabaseClient, codigo: string, remetente: string): Promise<{ negocioId: string; nomeNegocio: string } | null>`

- [ ] **Step 1: Write the failing test (só a parte pura)**

```ts
// tests/whatsapp-verificacao.test.ts
import { gerarCodigoNumerico } from "@/lib/whatsapp/verificacao";

test("gera código de 6 dígitos", () => {
  for (let i = 0; i < 50; i++) {
    expect(gerarCodigoNumerico()).toMatch(/^\d{6}$/);
  }
});
```

> `consumirCodigo` toca o banco (service_role); segue o padrão do projeto de **não** testar unitariamente funções de DB — é coberto pela prova viva (Task 8). O teste puro acima trava o formato do código.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- whatsapp-verificacao`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/whatsapp/verificacao.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export function gerarCodigoNumerico(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Chamado pelo webhook (service_role). Valida o código (existe + não expirou),
// exige correspondência única (segurança contra colisão), vincula o telefone
// do remetente ao negócio e apaga o código consumido.
export async function consumirCodigo(
  admin: SupabaseClient,
  codigo: string,
  remetente: string,
): Promise<{ negocioId: string; nomeNegocio: string } | null> {
  const agora = new Date().toISOString();
  const { data: linhas } = await admin
    .from("whatsapp_verificacoes")
    .select("negocio_id")
    .eq("codigo", codigo)
    .gt("expira_em", agora);
  if (!linhas || linhas.length !== 1) return null;

  const negocioId = linhas[0].negocio_id as string;

  const { error: eTel } = await admin
    .from("negocio_telefones")
    .upsert({ negocio_id: negocioId, telefone: remetente, verificado: true }, { onConflict: "telefone" });
  if (eTel) return null;

  const { data: neg } = await admin.from("negocios").select("nome").eq("id", negocioId).maybeSingle();
  await admin.from("whatsapp_verificacoes").delete().eq("negocio_id", negocioId);

  return { negocioId, nomeNegocio: (neg?.nome as string) ?? "seu negócio" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- whatsapp-verificacao`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/verificacao.ts tests/whatsapp-verificacao.test.ts
git commit -m "feat(whatsapp): geracao e consumo de codigo de verificacao"
```

---

### Task 6: Executor (resolver negócio + executar comando)

**Files:**
- Create: `src/lib/whatsapp/executor.ts`

**Interfaces:**
- Consumes: `Comando` (Task 1), respostas (Task 2), `hojeSP` de `@/lib/caixa/periodo`, `SupabaseClient` admin. **NÃO** usa o RPC `resumo_dashboard` — esse RPC faz `IF NOT e_membro(...) RAISE EXCEPTION` e depende de `auth.uid()`, que é NULL sob service_role; o saldo é calculado por query direta com `negocio_id` explícito (mesma fórmula do RPC: `SUM(entrada − saida)` para `carteira='empresa'`).
- Produces:
  - `interface NegocioWhats { id: string; nome: string; usa_estoque: boolean }`
  - `async function resolverNegocioPorTelefone(admin: SupabaseClient, telefone: string): Promise<NegocioWhats | null>`
  - `async function executarComando(admin: SupabaseClient, negocio: NegocioWhats, cmd: Comando, messageId: string): Promise<string>`

> Módulo de DB (service_role); coberto por prova viva (Task 8), sem teste unitário — segue o padrão do projeto. As mensagens que ele devolve vêm de `respostas.ts` (já testado).

- [ ] **Step 1: Escrever a implementação**

```ts
// src/lib/whatsapp/executor.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comando } from "@/lib/whatsapp/comandos";
import { hojeSP } from "@/lib/caixa/periodo";
import {
  mensagemAjuda, mensagemRegistrado, mensagemSaldo, mensagemEstoque, mensagemEstoqueDesativado,
} from "@/lib/whatsapp/respostas";

export interface NegocioWhats { id: string; nome: string; usa_estoque: boolean }

export async function resolverNegocioPorTelefone(
  admin: SupabaseClient,
  telefone: string,
): Promise<NegocioWhats | null> {
  const { data } = await admin
    .from("negocio_telefones")
    .select("negocios(id, nome, usa_estoque)")
    .eq("telefone", telefone)
    .eq("verificado", true)
    .maybeSingle();
  const n = (data as { negocios?: NegocioWhats } | null)?.negocios;
  return n ?? null;
}

// Saldo disponível = SUM(entrada − saida) para carteira='empresa'. Query direta
// (service_role + negocio_id explícito); NÃO usa resumo_dashboard, que exige
// auth.uid() (e_membro) e estouraria "acesso negado" sob service_role.
async function disponivel(admin: SupabaseClient, negocioId: string): Promise<number> {
  const { data } = await admin
    .from("lancamentos").select("tipo, valor")
    .eq("negocio_id", negocioId).eq("carteira", "empresa");
  let s = 0;
  for (const l of data ?? []) s += l.tipo === "entrada" ? Number(l.valor) : -Number(l.valor);
  return s;
}

export async function executarComando(
  admin: SupabaseClient,
  negocio: NegocioWhats,
  cmd: Comando,
  messageId: string,
): Promise<string> {
  if (cmd.tipo === "entrada" || cmd.tipo === "saida") {
    const descricao = cmd.descricao || (cmd.tipo === "entrada" ? "Venda" : "Despesa");
    // Idempotência: reentrega do webhook não duplica (UNIQUE negocio_id,origem_msg_id).
    await admin.from("lancamentos").upsert(
      {
        negocio_id: negocio.id, tipo: cmd.tipo, carteira: "empresa", eh_retirada: false,
        valor: cmd.valor, descricao, data: hojeSP(), origem: "whatsapp", origem_msg_id: messageId,
      },
      { onConflict: "negocio_id,origem_msg_id", ignoreDuplicates: true },
    );
    return mensagemRegistrado(cmd.tipo, cmd.valor, cmd.descricao, await disponivel(admin, negocio.id));
  }

  if (cmd.tipo === "consulta_saldo") {
    const hoje = hojeSP();
    const { data: lancs } = await admin
      .from("lancamentos").select("tipo, valor")
      .eq("negocio_id", negocio.id).eq("carteira", "empresa").eq("data", hoje);
    let entradas = 0, saidas = 0;
    for (const l of lancs ?? []) {
      if (l.tipo === "entrada") entradas += Number(l.valor);
      else saidas += Number(l.valor);
    }
    return mensagemSaldo(await disponivel(admin, negocio.id), entradas, saidas);
  }

  if (cmd.tipo === "consulta_estoque") {
    if (!negocio.usa_estoque) return mensagemEstoqueDesativado();
    let q = admin
      .from("itens").select("nome, estoque")
      .eq("negocio_id", negocio.id).eq("ativo", true).eq("controla_estoque", true).order("nome");
    if (cmd.filtro) q = q.ilike("nome", `%${cmd.filtro}%`);
    const { data: itens } = await q;
    return mensagemEstoque((itens ?? []).map((i) => ({ nome: i.nome, estoque: Number(i.estoque) })), cmd.filtro);
  }

  return mensagemAjuda();
}
```

- [ ] **Step 2: Verificar compilação/testes**

Run: `npm test`
Expected: PASS — os testes existentes continuam verdes (o executor não tem teste próprio; garante que nada quebrou o build de tipos).

- [ ] **Step 3: Commit**

```bash
git add src/lib/whatsapp/executor.ts
git commit -m "feat(whatsapp): executor (resolver negocio + executar comando)"
```

---

### Task 7: Rota webhook `/api/whatsapp`

**Files:**
- Create: `src/app/api/whatsapp/route.ts`

**Interfaces:**
- Consumes: `extrairMensagem`/`enviarTexto` (Task 3), `interpretar` (Task 1), `consumirCodigo` (Task 5), `resolverNegocioPorTelefone`/`executarComando` (Task 6), `mensagemConectado`/`mensagemCodigoInvalido`/`mensagemNaoReconhecido` (Task 2), `criarClienteAdmin` de `@/lib/supabase/admin`.
- Produces: endpoint `POST /api/whatsapp`.

- [ ] **Step 1: Escrever a rota**

```ts
// src/app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { extrairMensagem, enviarTexto } from "@/lib/whatsapp/uazapi";
import { interpretar } from "@/lib/whatsapp/comandos";
import { consumirCodigo } from "@/lib/whatsapp/verificacao";
import { resolverNegocioPorTelefone, executarComando } from "@/lib/whatsapp/executor";
import { mensagemConectado, mensagemCodigoInvalido, mensagemNaoReconhecido } from "@/lib/whatsapp/respostas";

export const runtime = "nodejs"; // service_role: fora do Edge.

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  // 1. Autentica o webhook por segredo compartilhado.
  if (req.nextUrl.searchParams.get("secret") !== process.env.UAZAPI_WEBHOOK_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  // 2. Extrai a mensagem; ignora o que não for DM de texto de terceiro.
  const body = await req.json().catch(() => null);
  const msg = extrairMensagem(body);
  if (!msg || msg.fromMe || msg.isGroup) return ok();

  const admin = criarClienteAdmin();
  const cmd = interpretar(msg.texto);

  // 3. Verificação é o único comando que funciona sem número verificado.
  if (cmd.tipo === "verificacao") {
    const r = await consumirCodigo(admin, cmd.codigo, msg.remetente);
    await enviarTexto(msg.remetente, r ? mensagemConectado(r.nomeNegocio) : mensagemCodigoInvalido());
    return ok();
  }

  // 4. Resolve o negócio pelo número verificado.
  const negocio = await resolverNegocioPorTelefone(admin, msg.remetente);
  if (!negocio) {
    await enviarTexto(msg.remetente, mensagemNaoReconhecido());
    return ok();
  }

  // 5. Executa e responde.
  try {
    const resposta = await executarComando(admin, negocio, cmd, msg.messageId);
    await enviarTexto(msg.remetente, resposta);
  } catch (e) {
    console.error("webhook whatsapp erro ao executar:", e);
  }
  return ok(); // 200 sempre (evita loop de retry da uazapi).
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS — a rota compila (rota dinâmica `/api/whatsapp`). Se o build reclamar de `import type { SupabaseClient }` não usado em runtime, é só type-import (ok).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/whatsapp/route.ts
git commit -m "feat(whatsapp): rota webhook /api/whatsapp"
```

---

### Task 8: UI "Conectar WhatsApp" em Configurações

**Files:**
- Create: `src/app/painel/configuracoes/ConectarWhatsApp.tsx`
- Modify: `src/app/painel/configuracoes/acoes.ts` (nova action `conectarWhatsApp`)
- Modify: `src/app/painel/configuracoes/page.tsx` (montar o componente com status + número sugerido)

**Interfaces:**
- Consumes: `negocioAtual`, `criarClienteServidor`, `gerarCodigoNumerico` (Task 5), `process.env.UAZAPI_NUMERO_BOT`.
- Produces:
  - server action `conectarWhatsApp(): Promise<{ codigo: string; link: string } | { erro: string }>`
  - componente `<ConectarWhatsApp numeroSugerido={string | null} conectados={string[]} />`

- [ ] **Step 1: Adicionar a server action em `acoes.ts`**

Anexar ao final de `src/app/painel/configuracoes/acoes.ts`:

```ts
import { gerarCodigoNumerico } from "@/lib/whatsapp/verificacao";

export async function conectarWhatsApp(): Promise<{ codigo: string; link: string } | { erro: string }> {
  const negocio = await negocioAtual();
  if (!negocio) return { erro: "Negócio não encontrado." };
  const supabase = criarClienteServidor();
  const codigo = gerarCodigoNumerico();
  const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  // PK por negocio_id → upsert substitui o código pendente anterior.
  const { error } = await supabase
    .from("whatsapp_verificacoes")
    .upsert({ negocio_id: negocio.id, codigo, expira_em: expira }, { onConflict: "negocio_id" });
  if (error) return { erro: "Não foi possível gerar o código." };
  const numeroBot = process.env.UAZAPI_NUMERO_BOT ?? "";
  const link = `https://wa.me/${numeroBot}?text=${encodeURIComponent(`AUTCHRONOS ${codigo}`)}`;
  return { codigo, link };
}
```

> `criarClienteServidor` e `negocioAtual` já estão importados no topo de `acoes.ts`; adicionar só o import de `gerarCodigoNumerico` junto aos demais imports do topo (mover a linha `import` para o bloco de imports, não deixar no meio do arquivo).

- [ ] **Step 2: Criar o componente client**

```tsx
// src/app/painel/configuracoes/ConectarWhatsApp.tsx
"use client";
import { useState, useTransition } from "react";
import { conectarWhatsApp } from "@/app/painel/configuracoes/acoes";

export function ConectarWhatsApp({ numeroSugerido, conectados }: { numeroSugerido: string | null; conectados: string[] }) {
  const [link, setLink] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const r = await conectarWhatsApp();
      if ("erro" in r) { setErro(r.erro); return; }
      setLink(r.link);
      setCodigo(r.codigo);
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">Conectar WhatsApp</p>
      {conectados.length > 0 ? (
        <p className="text-sm text-entrada">✅ Conectado: {conectados.join(", ")}</p>
      ) : (
        <p className="text-sm text-texto-suave">
          Registre lançamentos pelo WhatsApp. {numeroSugerido ? `Número cadastrado: ${numeroSugerido} — conecte por ele ou por outro.` : ""}
        </p>
      )}
      <button
        type="button"
        onClick={gerar}
        disabled={pendente}
        className="self-start bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pendente ? "..." : conectados.length > 0 ? "Conectar outro número" : "Conectar WhatsApp"}
      </button>
      {codigo && link && (
        <div className="flex flex-col gap-1 border border-borda p-3 text-sm">
          <p className="text-texto-suave">Toque no link abaixo e envie a mensagem já preenchida:</p>
          <a href={link} target="_blank" rel="noreferrer" className="font-semibold text-marca underline">
            Abrir WhatsApp com o código {codigo}
          </a>
          <p className="text-texto-suave">O código expira em 10 minutos.</p>
        </div>
      )}
      {erro && <p role="status" className="text-sm text-saida">{erro}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Montar em `page.tsx`**

Substituir o corpo de `src/app/painel/configuracoes/page.tsx` para buscar os telefones e renderizar o componente:

```tsx
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormCapacidades } from "@/app/painel/configuracoes/FormCapacidades";
import { FormNomeNegocio } from "@/app/painel/configuracoes/FormNomeNegocio";
import { ConectarWhatsApp } from "@/app/painel/configuracoes/ConectarWhatsApp";

export default async function Configuracoes() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const { data: telefones } = await supabase
    .from("negocio_telefones").select("telefone, verificado").eq("negocio_id", negocio.id);
  const numeroSugerido = telefones?.find((t) => !t.verificado)?.telefone ?? null;
  const conectados = (telefones ?? []).filter((t) => t.verificado).map((t) => t.telefone);

  const flags = {
    usa_estoque: negocio.usa_estoque, usa_fiado: negocio.usa_fiado,
    usa_locacao: negocio.usa_locacao, usa_carteiras: negocio.usa_carteiras,
    usa_metas: negocio.usa_metas,
  };
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Configurações</h1>
      <FormNomeNegocio nomeAtual={negocio.nome} />
      <ConectarWhatsApp numeroSugerido={numeroSugerido} conectados={conectados} />
      <p className="text-sm text-texto-suave">Ligue ou desligue os módulos do seu negócio.</p>
      <FormCapacidades inicial={flags} />
    </section>
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/painel/configuracoes/ConectarWhatsApp.tsx src/app/painel/configuracoes/acoes.ts src/app/painel/configuracoes/page.tsx
git commit -m "feat(whatsapp): UI Conectar WhatsApp em Configuracoes"
```

---

### Task 9: Env, setup do bot e prova viva (end-to-end)

**Files:**
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: tudo das tasks anteriores. Confirma o mapeamento do adapter (Task 3) contra um webhook real.

- [ ] **Step 1: Documentar as env vars**

Anexar a `.env.local.example`:

```
# Fase 6 — WhatsApp (uazapi)
UAZAPI_URL=https://SEU-HOST.uazapi.com
UAZAPI_TOKEN=token-da-instancia
UAZAPI_WEBHOOK_SECRET=um-segredo-forte-aleatorio
UAZAPI_NUMERO_BOT=5511999999999
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs(whatsapp): env vars da uazapi no .env.local.example"
```

- [ ] **Step 3: Setup do bot (guiado, passos manuais do usuário)**

1. Na uazapi: criar a instância, escanear o QR e conectar o número do bot. Copiar o **token** da instância e o **número**.
2. Preencher no `.env.local` (dev) e nas **env vars da Vercel** (produção): `UAZAPI_URL`, `UAZAPI_TOKEN`, `UAZAPI_WEBHOOK_SECRET` (gerar um segredo forte), `UAZAPI_NUMERO_BOT`.
3. Aplicar a migration `0013_whatsapp.sql` no SQL Editor do Supabase Cloud (se ainda não aplicada na Task 4).
4. Configurar o webhook na uazapi apontando para
   `https://meu-gestor-phi.vercel.app/api/whatsapp?secret=<UAZAPI_WEBHOOK_SECRET>`, evento de **mensagem recebida**.

- [ ] **Step 4: Capturar um webhook real e confirmar o adapter**

Enviar uma mensagem de teste ao bot e inspecionar o payload real (log da função na Vercel, ou uma captura temporária). Conferir os nomes de campo em `extrairMensagem` (`message.id`/`messageid`, `text`/`content`, `sender`/`chatid`, `fromMe`, `isGroup`). Se divergirem, ajustar **só** `src/lib/whatsapp/uazapi.ts` e `tests/whatsapp-uazapi.test.ts`, rodar `npm test -- whatsapp-uazapi` e commitar.

- [ ] **Step 5: Prova viva (critério de pronto)**

Com o número conectado (Configurações → Conectar WhatsApp → enviar o código):
1. Enviar `+50 teste` → responde confirmação; aparece lançamento de entrada R$50 no painel com `origem='whatsapp'`.
2. Reenviar a mesma mensagem (simular reentrega do webhook, mesmo `messageId`) → **não duplica**.
3. `saldo` → responde o valor correto.
4. `estoque` → lista itens (ou "não usa estoque" se `usa_estoque` off).
5. Mensagem de um número **não verificado** → resposta padrão, sem vazar dados.
6. `npm test` verde e `npm run verificar:rls` verde (12 tabelas).

- [ ] **Step 6: Commit final (se houve ajuste no adapter)**

```bash
git add src/lib/whatsapp/uazapi.ts tests/whatsapp-uazapi.test.ts
git commit -m "fix(whatsapp): ajusta mapeamento do adapter ao payload real da uazapi"
```

---

## Notas e limitações conhecidas (follow-ups, fora de escopo)

- `parseValor`: um ponto sozinho é tratado como decimal (`"1.000"` → 1). MEIs raramente digitam separador de milhar em valores pequenos; documentado, não tratado no MVP.
- Sem rate limiting para números não verificados (responder é barato). Anotar se virar abuso.
- Sem linguagem natural/IA, sem venda com itens/baixa de estoque pelo WhatsApp, sem a receber/retirada/locação, sem áudio/mídia.
- Google OAuth, SMTP próprio (Resend) e monetização (Wiapy) seguem como itens separados do roadmap.
```

