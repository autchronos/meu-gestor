# Prompt para o Claude Code — Autchronos

Copie tudo abaixo da linha e cole no Claude Code:

---

Quero que você construa um SaaS completo chamado **"Autchronos - Seu Gestor Financeiro"** — um app de gestão financeira e fluxo de caixa para micro-empreendedores brasileiros (vendedores, quem trabalha com aluguéis, autônomos etc.).

## Stack

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend:** API Routes do Next.js
- **Banco de dados:** Supabase (PostgreSQL) com Row Level Security por usuário
- **Autenticação:** Supabase Auth (e-mail/senha + login com Google)
- **PWA:** configurar manifest.json, service worker e ícones para o app ser instalável no celular
- Idioma de toda a interface: **português do Brasil**. Moeda: **R$ (Real)**, formato brasileiro (1.234,56)

## Design system (OBRIGATÓRIO — siga fielmente)

O design foi definido no Claude Design (estilo "Institucional Clássico" — banco tradicional, sóbrio e confiável). **Implemente seguindo fielmente os designs anexados/do handoff — não invente layouts próprios.** Tokens principais:

- **Fundo:** branco-gelo `#F7F8FA`; cards brancos com bordas sutis (sem sombras fortes), linhas divisórias finas
- **Cor principal:** azul-marinho profundo `#0A2540` — header, navegação, títulos
- **Acento:** dourado discreto `#C9A227` — apenas em ícones de destaque e no indicador de saldo
- **Entradas:** verde-escuro `#1B7A4B` · **Saídas:** vinho `#9B2335`
- **Tipografia:** serifada apenas no logo e nos números do saldo; sans-serif clássica e legível no restante
- **Layout:** denso e organizado como extrato bancário; sensação de tradição, seriedade e instituição sólida
- Configurar esses tokens no Tailwind (`tailwind.config`) como cores nomeadas do tema, para uso consistente em todo o app

## 1. Página inicial (landing page pública)

Antes do login, a rota `/` deve ser uma landing page de apresentação do produto:

- Hero com o nome "Autchronos - Seu Gestor Financeiro", slogan e mockup/ilustração do app
- Seções apresentando os principais recursos: lançamentos automáticos pelo WhatsApp, fluxo de caixa visual, controle de estoque por nicho
- Seção "Como funciona" em 3 passos
- Botão destacado **"Entrar / Cadastrar"** no header e no hero
- **No mobile:** exibir um botão "📲 Baixar no celular" que dispara o prompt de instalação do PWA (evento `beforeinstallprompt`). Se o navegador não suportar, mostrar instruções de como adicionar à tela inicial
- Design moderno, dark mode como padrão, responsivo, com identidade visual própria (tons de roxo/azul escuro como base)

## 2. Cadastro e onboarding

Após criar a conta, um onboarding em etapas:

1. Nome do negócio
2. **Escolha do nicho** (isso define o módulo de estoque): Vendas de produtos / Alimentação (açaí, lanches etc.) / Aluguéis / Serviços / Outro
3. Número de WhatsApp que será usado para os lançamentos
4. Saldo inicial em caixa (opcional)

O nicho escolhido fica salvo no perfil e adapta o vocabulário e os campos do módulo de estoque.

## 3. Dashboard financeiro (área logada)

- **Visão geral:** dois saldos lado a lado — **"Disponível hoje"** (dinheiro que já caiu) e **"A receber"** (vendas a prazo ainda não recebidas) —, total de entradas e saídas do mês, gráfico de fluxo de caixa (linha, últimos 30 dias), últimos lançamentos
- **Lançamentos:** lista com filtros por período, tipo (entrada/saída), categoria e origem (manual ou WhatsApp). CRUD completo
- **Categorias:** padrão (vendas, aluguel, fornecedores, contas fixas etc.) + personalizadas
- **Relatórios:** resumo mensal, comparativo mês a mês, exportação em CSV
- Layout mobile-first: micro-empreendedor vai usar principalmente no celular

## 3.1 Separação PF/PJ e retiradas (pró-labore)

A dor nº 1 do público é misturar o dinheiro pessoal com o da empresa. O app precisa resolver isso de forma explícita:

- Todo lançamento pertence a uma **carteira**: `Empresa` ou `Pessoal`
- Tipo de lançamento especial: **Retirada** (dinheiro saindo da empresa para o dono) — sai da carteira Empresa e entra na Pessoal, sem ser contabilizado como despesa do negócio
- Tela "Minhas retiradas": total retirado no mês, média semanal, histórico
- **Limite de pró-labore:** o usuário define um valor mensal; a tela mostra quanto já retirou e quanto resta. Alerta visual (e mensagem no WhatsApp) ao ultrapassar
- Card no dashboard: "Você já retirou R$ X de R$ Y este mês"
- Pelo WhatsApp: "tirei 200 pra mim" → registra retirada

## 3.2 Contas a receber (vendas a prazo, fiado e cartão)

O público vende fiado, parcelado no cartão e em marketplace — o dinheiro entra depois. O app precisa distinguir **saldo real** de **saldo aparente**:

- Ao registrar uma entrada, o usuário informa se é **à vista** ou **a receber** (com data prevista de recebimento e, opcionalmente, nome do cliente)
- Tela "A receber": lista ordenada por data, total a receber, destaque para vencidos
- Ao receber, um toque marca como recebido e o valor entra no saldo disponível
- **Taxas de cartão:** permitir cadastrar percentual de taxa por forma de pagamento; o valor líquido é o que entra no saldo
- Projeção: gráfico mostrando o saldo previsto para os próximos 30 dias considerando o que está a receber
- Pelo WhatsApp: "vendi 300 fiado pro João pra semana que vem" → entrada a receber

## 3.3 Metas e reserva de caixa

- O usuário define uma **meta de reserva** (valor) e um prazo
- Tela mostrando progresso da reserva com barra visual
- Possibilidade de separar um valor como "reservado" (não entra no saldo disponível para gastar)
- Sugestão automática de aporte semanal com base no fluxo dos últimos 30 dias
- Alerta quando o saldo disponível ficar abaixo de um mínimo definido pelo usuário

## 4. Integração com WhatsApp

O usuário manda mensagem numa conversa do WhatsApp e o lançamento entra automaticamente no app:

- **Arquitetura:** usar a **Evolution API** (open source, padrão no Brasil) rodando em container próprio, conectada via webhook a uma API Route do Next.js. Estruturar o código de forma que seja fácil trocar depois pela WhatsApp Cloud API oficial
- **Fluxo:** mensagem recebida → webhook → parser interpreta o texto → cria lançamento vinculado ao usuário dono daquele número → responde no WhatsApp confirmando ("✅ Entrada de R$ 45,00 registrada: venda de açaí")
- **Parser de mensagens:** interpretar linguagem natural simples, por exemplo:
  - "vendi 3 açaí 45" → entrada de R$ 45,00, categoria vendas, baixa 3 unidades no estoque
  - "paguei fornecedor 200" → saída de R$ 200,00, categoria fornecedores
  - "recebi aluguel 800" → entrada de R$ 800,00, categoria aluguéis
  - Se a mensagem for ambígua, responder pedindo esclarecimento
  - Implementar primeiro com regex/regras; deixar preparado um modo opcional usando a API da Anthropic para interpretar mensagens complexas
- Comandos úteis: "saldo" retorna o saldo atual; "resumo" retorna o resumo do dia
- Página de configuração no app para conectar/desconectar o número (exibir QR code da Evolution API)

## 5. Controle de estoque (adaptado ao nicho)

- CRUD de itens: nome, quantidade, custo, preço de venda, estoque mínimo
- Alerta visual quando o item atinge o estoque mínimo
- Vendas registradas (pelo app ou WhatsApp) dão baixa automática quando o item é identificado
- Adaptação por nicho: "Produtos" para vendas, "Ingredientes/Produtos" para alimentação, "Imóveis/Itens alugados" (com status disponível/alugado) para aluguéis; nicho "Serviços" oculta o módulo ou mostra versão simplificada de materiais

## 6. Estrutura e qualidade

- Modelagem do banco: `profiles` (com nicho e limite de pró-labore), `transactions` (com carteira empresa/pessoal, tipo entrada/saída/retirada, status pago/a receber, data prevista, taxa), `categories`, `receivables` (ou o status dentro de transactions), `goals` (metas e reserva), `inventory_items`, `whatsapp_connections`, `whatsapp_messages` (log)
- Código organizado, componentes reutilizáveis, tipagem forte
- Seed com dados de exemplo para desenvolvimento
- README explicando como rodar o projeto, configurar o Supabase e a Evolution API

## Ordem de construção

Construa em fases, me mostrando o resultado de cada uma antes de seguir:

1. Setup do projeto + landing page + PWA
2. Auth + onboarding + estrutura do banco
3. Dashboard financeiro completo (lançamentos manuais) + carteiras PF/PJ e retiradas
4. Contas a receber (saldo disponível vs. a receber) + metas e reserva
5. Controle de estoque
6. Integração WhatsApp (webhook + parser + respostas)

Comece pela fase 1.
