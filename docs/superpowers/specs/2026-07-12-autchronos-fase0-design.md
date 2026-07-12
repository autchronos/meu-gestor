# Autchronos — Design da Fase 0 (Fundação e Identidade)

**Data:** 12/07/2026
**Base:** `PLANO-DE-ACAO-APP-MEI.txt` (auto-contido; este documento resolve as decisões
em aberto A1, A2 e A3 daquele plano e não substitui o restante dele)

---

## 1. Identidade

**Nome:** Autchronos
**Tagline:** Gestão financeira e fluxo de caixa para empreendedores

O nome é institucional e não descreve a função sozinho; a tagline carrega o
significado e deve aparecer junto do nome no login, no manifest do PWA e nos
materiais de instalação. Decisão tomada e fechada — não reabrir.

---

## 2. Sistema de cores

### Princípio (é o que sustenta o sistema)

**A cor da marca nunca toca um valor em dinheiro.** Verde e vermelho são
reservados exclusivamente para entrada e saída, em qualquer parte do app. Se a
marca também fosse verde, o verde deixaria de significar "entrou" e viraria
apenas "a cor do app" — o usuário perderia a capacidade de ler o extrato pelo
matiz, que é o sinal mais valioso da interface.

O "toque tech" vem da **estrutura** (cards nítidos, ícones lineares, tipografia),
nunca de brilho, glow ou neon.

### Tokens semânticos

As cores entram no `tailwind.config` como **tokens semânticos**, não como cores
cruas. Isso impede que alguém escreva `text-green-600` num valor por engano e faz
o sistema se manter sozinho.

| Token     | Papel                        | Claro     | Escuro    |
|-----------|------------------------------|-----------|-----------|
| `fundo`   | Fundo da aplicação           | `#F6F7F3` | `#12171F` |
| `superficie` | Cards e superfícies       | `#FFFFFF` | `#1A2230` |
| `texto`   | Texto principal              | `#12171F` | `#E8EAED` |
| `marca`   | Logo, navegação, botões      | `#1E3A5F` | `#7FB0E0` |
| `entrada` | Dinheiro que entra           | `#2E7D32` | `#5CBF63` |
| `saida`   | Dinheiro que sai             | `#C62828` | `#F1706B` |
| `meta`    | Meta atingida (só isso)      | `#B98A22` | `#D9A93C` |

**Tema claro é o padrão.** O tema escuro é opcional, à escolha do usuário. A lógica
de cor é idêntica nos dois — o que muda é o valor, nunca o significado.

### Correções de contraste (obrigatórias, não são preferência)

1. **Dourado (`meta`) não passa em contraste como texto** sobre `#F6F7F3`
   (~3,1:1; o mínimo WCAG AA para texto é 4,5:1). Uso permitido: preenchimento
   (barra de progresso cheia, badge com fundo dourado e texto escuro, ícone).
   Quando precisar ser texto, usar `#8F6A14`.
2. **Verde e vermelho do tema claro somem no tema escuro.** Por isso cada papel
   tem dois valores (coluna acima). Mesma semântica, valor diferente.

### Tipografia

- **Títulos:** Space Grotesk
- **Corpo:** Inter

---

## 3. Stack (confirmada do plano, seção 4)

React 19 + Vite + TypeScript · Tailwind CSS (tema novo) · TanStack Query v5 ·
Supabase (Postgres + Auth + RLS) · Recharts · jsPDF + autoTable ·
Vitest + Testing Library · vite-plugin-pwa

Alias `@/` → `src/`.

---

## 4. Infraestrutura (A3)

**Hospedagem: Hostinger (arquivos estáticos) + Supabase novo.**

### Justificativa

O app é um SPA compilado pelo Vite: o build produz arquivos estáticos e **não
existe processo de servidor próprio**. Todo o backend é o Supabase, que é
gerenciado. Portanto:

- **VPS foi descartado.** Pagar e administrar Linux, Nginx, SSL e uptime para
  servir arquivos estáticos é custo sem retorno. VPS só se justificaria com um
  processo próprio rodando (API em Node, jobs, websocket) — que este projeto,
  por desenho, não tem.
- **Escala não é limitada pela hospedagem.** Arquivo estático em CDN escala sem
  esforço. O gargalo real é o Supabase (Postgres), com caminho free → Pro
  (~US$25/mês) → conforme uso.

### O que de fato determina a escala (Fase 1, no `schema.sql`)

- **Índice em `negocio_id` em toda tabela de negócio.**
- **Policies de RLS eficientes.** RLS mal escrita faz o Postgres varrer a tabela
  inteira a cada consulta e o app degrada com poucas centenas de clientes.

A escala se ganha ou se perde aqui, não na escolha do host.

### Requisito técnico da Hostinger

SPA com rotas precisa de `.htaccess` reescrevendo todas as rotas para
`index.html`. Sem isso, atualizar a página em `/caixa` retorna 404.
Deploy é manual (`npm run build` → subir `dist/`); opcionalmente uma GitHub
Action envia por FTP.

---

## 5. Entregável da Fase 0

Ao final desta fase:

- [ ] Projeto Vite (React + TS) criado, `git init`
- [ ] Dependências instaladas
- [ ] Tailwind configurado com os **tokens semânticos** acima (claro + escuro)
- [ ] Fontes Space Grotesk e Inter carregadas
- [ ] Alias `@/` funcionando
- [ ] `.env.local` + `.env.local.example` (Supabase)
- [ ] Vitest + Testing Library configurados
- [ ] `.htaccess` para SPA na Hostinger
- [ ] App roda em branco com a identidade visual aplicada

**Fora do escopo desta fase:** banco, auth, qualquer módulo. O plano é sequencial
de propósito (risco R6).

---

## 6. Restrições de compatibilidade futura (agente de WhatsApp)

**Não construir na v1.** Esta seção existe para que o `schema.sql` da Fase 1 nasça
compatível com um agente de WhatsApp (o usuário manda "vendi 2 açaí de 300" e o
lançamento cai no app, sem login). As três exigências abaixo custam ~20 linhas de
SQL agora e uma migração dolorosa depois, com clientes reais em produção.

### 6.1 Toda escrita passa por RPC no banco — nunca por lógica no React

A regra "registrar uma venda" (lançamento + `lancamento_itens` + baixa de estoque)
mora no Postgres como `registrar_venda(...)`, não dentro de um componente. Assim o
app é **um** cliente da função e o agente de WhatsApp é **outro cliente da mesma
função**. Se a regra morar no React, o agente terá que reimplementá-la, e as duas
versões vão divergir.

O plano original já pedia RPC para a venda, por causa da atomicidade (risco R3).
Esta seção **estende a regra a todas as escritas**: `registrar_venda`,
`registrar_saida`, `marcar_recebido_pago`, `registrar_locacao`, `devolver_locacao`.

### 6.2 Identidade por telefone, não por sessão

O webhook chega sabendo apenas o número que enviou a mensagem. É preciso uma tabela
ligando telefone → negócio, com verificação por código — e **nunca** confiar no que
a mensagem afirma ser:

```
negocio_telefones (negocio_id, telefone, verificado BOOL, created_at)
```

Isto só funciona porque o isolamento já é por `negocio_id` e não por `user_id`
(decisão D1). É o multi-tenant que permite escrever sem login.

### 6.3 Idempotência: mensagem duplicada não pode virar lançamento duplicado

O WhatsApp reentrega webhooks quando não recebe confirmação (garantia de "pelo
menos uma vez"). Sem defesa, uma venda de R$ 200 vira duas — o pior bug possível
num app de dinheiro. `lancamentos` ganha:

```
origem TEXT NOT NULL DEFAULT 'app'   -- 'app' | 'whatsapp'
origem_msg_id TEXT NULL              -- id da mensagem do WhatsApp
UNIQUE (negocio_id, origem_msg_id)   -- reentrega não insere de novo
```

De brinde, dá para saber o que veio do WhatsApp e o que foi digitado no app.

### 6.4 Onde o agente vai rodar (não é VPS)

**Supabase Edge Function.** Recebe o webhook, guarda os segredos (a chave da API de
LLM **jamais** pode existir no frontend) e chama as RPCs de 6.1. Não há servidor
para administrar. A decisão de infra da seção 4 permanece válida.

### 6.5 Regra de produto: o agente confirma antes de gravar

O agente vai errar ("2 de 300" — 300ml ou R$ 300?). Ele **nunca** escreve direto no
caixa: responde `Registrei: 2x Açaí 300ml = R$ 30,00. Confirma?` e só grava no
"sim". É a diferença entre uma ferramenta em que o dono confia e uma que ele
desliga depois de contaminar o caixa.

O catálogo de itens (decisão D2) é o que ancora a interpretação do texto: o agente
lê os itens daquele negócio para traduzir "açaí de 300" no `item_id` correto.

---

## 7. Roteiro de distribuição (PWA → Play Store → iOS)

**Não construir agora.** Registrado para que as decisões de arquitetura não fechem portas.
A boa notícia: o Autchronos é um SPA estático puro (sem servidor próprio, sem SSR), e isso
já é exatamente o que os três caminhos abaixo exigem. **Nada precisa ser refeito.**

### 7.1 PWA instalável (Fase 7) — barato e já planejado

`vite-plugin-pwa` + manifest + ícones + service worker. Instalável no Android, no iPhone
(via "Adicionar à Tela de Início") e no desktop (Windows/Mac). É o alicerce dos outros dois.

### 7.2 Google Play — viável e barato

O Google tem um caminho oficial: **TWA (Trusted Web Activity)**, empacotado com Bubblewrap.
Na prática, embrulha o mesmo PWA num APK. Registro de desenvolvedor: **US$ 25, pagamento
único**. Não exige reescrever nada.

### 7.3 Apple App Store — caro, lento, e com três travas reais

1. **A Apple rejeita "PWA embrulhado".** A diretriz 4.2 (Minimum Functionality) barra app que
   é só um site dentro de um navegador. Para passar, precisa de recurso nativo de verdade
   (push, câmera, biometria). Caminho: **Capacitor** — que roda o nosso mesmo código dentro
   de um app nativo.
2. **Não se publica na Apple a partir do Windows.** Compilar e assinar iOS exige macOS com
   Xcode. Saídas: Mac na nuvem (Codemagic, EAS Build) ou um Mac de verdade. É trava da Apple,
   não nossa.
3. **US$ 99/ano**, revisão manual que reprova e volta, política de privacidade obrigatória, e
   — como o app tem contas — **exclusão de conta dentro do app é obrigatória** pela Apple.

### 7.4 A ordem, e o porquê

**PWA (Fase 7) → Play Store (TWA) → validar com usuários reais (Fase 8) → só então iOS.**

Gastar US$ 99/ano, alugar Mac e brigar com a revisão da Apple ANTES de saber se o app é bom
é pagar caro por um produto que ainda vai mudar muito. A Fase 8 (2-3 micro-empreendedores
reais usando) existe justamente para dizer o que vale virar app nativo.

### 7.5 O que isso BLOQUEIA agora

**A logo.** Loja de app exige ícone de verdade, 1024×1024. O favicon atual é um monograma "A"
placeholder. Isso vira bloqueio real na Fase 7 — decisão pendente do dono.

---

## 8. O que este documento NÃO altera

Todas as decisões D1–D8 e o modelo de dados da seção 5 do plano original seguem
valendo sem mudança. Este documento fecha apenas A1, A2 e A3.
