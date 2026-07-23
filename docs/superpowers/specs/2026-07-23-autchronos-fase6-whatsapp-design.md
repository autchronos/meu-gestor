# Fase 6 — WhatsApp via uazapi (design)

**Data:** 2026-07-23
**Status:** aprovado, aguardando plano de implementação
**Escopo:** integração de WhatsApp para registrar/consultar o caixa por comandos, sem login.

## 1. Objetivo

Permitir que o MEI opere o Autchronos pelo WhatsApp com **comandos rígidos** (determinísticos, sem IA):

- registrar entrada e saída de dinheiro;
- consultar saldo/resumo do dia;
- consultar estoque;
- receber ajuda/menu.

O número de quem envia identifica o negócio (via `negocio_telefones`, isolamento por `negocio_id`, nunca `user_id`). O schema já foi desenhado para isso desde a migration 0001 (`negocio_telefones`, `lancamentos.origem`/`origem_msg_id`, `UNIQUE(negocio_id, origem_msg_id)`).

**Não-objetivos (YAGNI, follow-ups):** linguagem natural/IA; venda com itens pelo WhatsApp (estoque é só consulta); a receber/retirada/locação pelo WhatsApp; áudio/mídia/imagens; rate limiting sofisticado.

## 2. Decisões travadas (do brainstorming, 2026-07-23)

- **Provedor:** uazapi (uazapiGO). Substitui a Evolution API do plano original.
- **Interpretação:** comandos rígidos, sem IA. Sem `ANTHROPIC_API_KEY`, sem custo por mensagem, determinístico e testável.
- **Número do bot:** um **número único central** (uma instância uazapi). Todos os MEIs mandam para ele; o remetente identifica o negócio. (Rejeitado: uma instância por MEI — custo/complexidade explodem.)
- **Sintaxe:** aceita **as duas formas** — símbolo (`+50 bolo` / `-30 gasolina`) e por extenso (`entrada 50 bolo` / `saida 30 gasolina`).
- **Verificação do número:** **código gerado no app** + link `wa.me`. Prova posse da conta (logado gera o código) e do número (código só chega ao bot se enviado daquele WhatsApp). (Rejeitado: confiar direto no número digitado no onboarding — inseguro.)
- **Número do onboarding:** aparece **pré-preenchido como sugestão** na tela de conectar; é só UX, sem imposição. O número verificado é o que enviar o código.
- **Local da UI de conexão:** dentro de `/painel/configuracoes` (sem novo item de nav).
- **Processamento:** síncrono na rota (Vercel serverless). Sem fila.
- **Formato da uazapi:** confirmado contra um **webhook real** durante o setup; isolado num adapter. Não confiar cegamente na doc.

## 3. Fluxo

```
MEI (WhatsApp)  ──"+50 bolo"──►  uazapi  ──webhook POST──►  /api/whatsapp
                                                                  │
                                    1. autentica webhook (segredo compartilhado)
                                    2. extrai msg (adapter uazapi -> MensagemRecebida)
                                    3. ignora fromMe / grupo
                                    4. resolve negócio pelo nº verificado (service_role)
                                    5. interpreta comando (parser puro)
                                    6. executa (service_role + negocio_id explícito,
                                       respeitando capacidades usa_estoque)
                                    7. responde confirmação (adapter uazapi -> enviarTexto)
MEI (WhatsApp)  ◄──"✅ Entrada R$50 (bolo). Saldo: R$X"──  uazapi  ◄─────────┘
```

## 4. Comandos

Tolerantes a acento, caixa, vírgula decimal (`50,50`) e prefixo `R$`.

| Mensagem do MEI | Comando interpretado | Ação |
|---|---|---|
| `+50 bolo` / `entrada 50 bolo` | `{ tipo: 'entrada', valor: 50, descricao: 'bolo' }` | cria lançamento de entrada |
| `-30 gasolina` / `saida 30 gasolina` / `saída 30 gasolina` | `{ tipo: 'saida', valor: 30, descricao: 'gasolina' }` | cria lançamento de saída |
| `saldo` / `resumo` / `hoje` | `{ tipo: 'consulta_saldo' }` | responde saldo disponível + total do dia |
| `estoque` / `estoque bolo` | `{ tipo: 'consulta_estoque', filtro?: 'bolo' }` | responde níveis de estoque (gated `usa_estoque`) |
| `ajuda` / `menu` / não reconhecido | `{ tipo: 'ajuda' }` | responde lista de comandos com exemplos |
| `AUTCHRONOS 4823` | `{ tipo: 'verificacao', codigo: '4823' }` | vincula/verifica o número |

**Regras do parser:**
- Valor obrigatório e `> 0` para entrada/saída; ausente/zero → vira `ajuda` com dica (*"Não entendi o valor. Tente: +50 bolo"*).
- Descrição = o texto após o valor; pode ser vazia (descrição default, ex.: "Venda"/"Despesa").
- `categoria_id` fica `null` (o schema permite); WhatsApp não escolhe categoria no MVP.
- `carteira` default `empresa`.
- `verificacao` é o **único** comando que funciona sem o número já estar verificado.

## 5. Módulos

Cada unidade tem uma responsabilidade e é testável isolada. Segue o padrão do app (libs em `src/lib/`, rotas finas).

### 5.1 Adapter uazapi — `src/lib/whatsapp/uazapi.ts`
Camada anticorrupção; **todo detalhe da uazapi vive só aqui**.
- `extrairMensagem(payload: unknown): MensagemRecebida | null` — normaliza o webhook. Retorna `null` se não for uma mensagem processável (ex.: evento de status/QR). Tipo interno:
  ```ts
  interface MensagemRecebida {
    remetente: string;   // dígitos, formato 5511999999999
    texto: string;
    messageId: string;
    fromMe: boolean;
    isGroup: boolean;
  }
  ```
- `enviarTexto(numero: string, texto: string): Promise<void>` — POST no endpoint de envio da uazapi com `UAZAPI_TOKEN`. Loga falha, não lança para o chamador quebrar o fluxo já concluído.
- **Nota de implementação:** URL de envio, headers e campos exatos do payload serão confirmados capturando um webhook real no setup (ver §9). Até lá, o adapter documenta o mapeamento como "a confirmar".

### 5.2 Parser de comandos — `src/lib/whatsapp/comandos.ts`
Função **pura** `interpretar(texto: string): Comando`. Sem rede, sem DB. Onde mora a maior massa de testes.

### 5.3 Verificação — `src/lib/whatsapp/verificacao.ts`
- `gerarCodigo(negocioId): Promise<string>` — chamado pela server action do app (usuário logado), usa o **cliente autenticado** (RLS `e_membro`); faz upsert em `whatsapp_verificacoes` (PK `negocio_id` → substitui código anterior do mesmo negócio). Código de 6 dígitos aleatórios (colisão improvável; ver abaixo).
- `consumirCodigo(codigo, remetente): Promise<{ negocioId, nomeNegocio } | null>` — chamado pelo webhook via **service_role**. Seleciona linhas com `codigo` igual e `expira_em > now()`; exige **exatamente uma** correspondência (0 ou >1 → retorna `null`, por segurança contra colisão de código). Faz upsert em `negocio_telefones (negocio_id, telefone=remetente, verificado=true)`, apaga o código consumido.

### 5.4 Rota webhook — `src/app/api/whatsapp/route.ts`
Rota fina que orquestra os módulos com `service_role` + `negocio_id` explícito. **Não reimplementa regra de negócio** — reusa `fluxoES`/inserção de lançamento, o RPC `resumo_dashboard` (saldo) e os cálculos de estoque existentes.

Passos: (1) autentica segredo → 401 se inválido; (2) `extrairMensagem`; (3) ignora `fromMe`/`isGroup` (200 e sai); (4) `interpretar`; (5) se `verificacao` → `consumirCodigo`; (6) senão, resolve negócio pelo número verificado — se não achar, responde "número não reconhecido" e sai; (7) executa a ação respeitando capacidades; (8) insere lançamento com `origem='whatsapp'` + `origem_msg_id` (onConflict ignore = idempotência); (9) `enviarTexto` confirmação; (10) retorna **200 sempre** (exceto 401).

### 5.5 UI "Conectar WhatsApp" — em `src/app/painel/configuracoes/`
Componente client + server action. Mostra status (conectado/não), o número do onboarding pré-preenchido como sugestão, botão que chama `gerarCodigo` e exibe o link `https://wa.me/<UAZAPI_NUMERO_BOT>?text=AUTCHRONOS%20<codigo>`. Ao tocar, o WhatsApp abre com o texto pronto.

## 6. Modelo de dados / Migration `0013_whatsapp.sql`

- Nova tabela:
  ```sql
  CREATE TABLE whatsapp_verificacoes (
    negocio_id UUID PRIMARY KEY REFERENCES negocios(id) ON DELETE CASCADE,
    codigo     TEXT NOT NULL,
    expira_em  TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
  (PK por `negocio_id` = um código pendente por negócio; gerar de novo substitui.)
- RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + policy `e_membro(negocio_id)` FOR ALL TO authenticated (o app gera/lê seu próprio código). O webhook opera via `service_role`, que ignora RLS.
- Índice: `CREATE INDEX ... ON negocio_telefones (telefone) WHERE verificado;` para a resolução no webhook.
- Já existentes (não recriar): tabela `negocio_telefones`, colunas `lancamentos.origem`/`origem_msg_id`, `UNIQUE(negocio_id, origem_msg_id)`.
- Passa pelo guardião `npm run verificar:rls` (11 → 12 tabelas com RLS).

## 7. Segurança

- **Webhook autenticado** por segredo compartilhado (`UAZAPI_WEBHOOK_SECRET` na query string ou header); inválido → 401. Nunca confiar no payload cru.
- `service_role` só dentro da rota server-only; nunca exposto ao cliente.
- Processa **só DM de terceiros**: `fromMe=true` ou `isGroup=true` → ignora.
- **Idempotência:** insert com `onConflict` no `UNIQUE(negocio_id, origem_msg_id)` — reentrega do webhook não duplica lançamento.
- **200 sempre** (exceto 401) para não disparar loop de retry da uazapi.
- **Verificação:** código curto, uso único, expiração (~10 min). Vínculo final `negocio_id → telefone do remetente`.
- **Número não verificado** (e não é código válido): responde só *"Número não reconhecido. Conecte seu WhatsApp no app: meu-gestor-phi.vercel.app"* e para. Não vaza dados.
- **Follow-up anotado:** rate limiting por número não verificado, se virar problema de abuso.

## 8. Tratamento de erros (resposta ao MEI)

- Comando inválido → ajuda com exemplos.
- Valor faltando/zero → *"Não entendi o valor. Tente: +50 bolo"*.
- `estoque` sem `usa_estoque` → *"Seu negócio não usa controle de estoque."*
- Falha ao enviar resposta (uazapi fora) → loga; **o lançamento já foi gravado, não reverte**; retorna 200.

## 9. Setup do bot (passos manuais do usuário, guiados)

Conta uazapi já existe; falta a instância.
1. Criar/conectar a instância na uazapi (escanear QR); pegar **token** e **número do bot**.
2. Env vars (Vercel + `.env.local.example`): `UAZAPI_URL`, `UAZAPI_TOKEN`, `UAZAPI_WEBHOOK_SECRET`, `UAZAPI_NUMERO_BOT`.
3. Apontar o webhook da uazapi para `https://meu-gestor-phi.vercel.app/api/whatsapp?secret=<UAZAPI_WEBHOOK_SECRET>`.
4. **Capturar um webhook real** (enviar mensagem de teste; logar o payload) para travar o mapeamento do adapter em §5.1.

## 10. Testes

- **Parser (`comandos.ts`):** as duas sintaxes; vírgula/`R$`/acento/caixa; entrada/saída; valor faltando/zero → ajuda; `saldo`/`resumo`/`hoje`; `estoque`/`estoque <filtro>`; `AUTCHRONOS <codigo>`; texto lixo → ajuda.
- **Adapter (`extrairMensagem`):** payloads DM / grupo / `fromMe` / evento não-mensagem (→ null). Usa o payload real capturado.
- **Verificação:** código válido, expirado, inexistente; upsert marca `verificado=true`.
- A rota é integração — cobrir as funções puras + a resolução; prova viva no setup.

## 11. Prova viva (critério de pronto)

Com a instância conectada: enviar `+50 teste` do WhatsApp verificado → aparece lançamento de entrada R$50 no painel com `origem='whatsapp'`; reenviar (simular reentrega) → não duplica; `saldo` → responde o valor certo; número não verificado → resposta padrão sem vazar. Migration 0013 aplicada e `verificar:rls` verde.
