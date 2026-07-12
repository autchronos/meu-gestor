# Autchronos — Fase 1 (Banco e Autenticação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um banco Postgres multi-tenant, protegido por RLS **provada com duas contas reais**, e um fluxo de cadastro/login funcionando, com o app já barrando quem não está autenticado.

**Architecture:** O isolamento é por `negocio_id`, nunca por `user_id` — é isso que destrava o SaaS depois sem migração. Toda policy pergunta "o usuário logado é membro deste negócio?" através da função `e_membro()`. A criação do negócio acontece por uma RPC `SECURITY DEFINER`, e **ninguém tem INSERT direto em `negocio_usuarios`** — se tivesse, um usuário se adicionaria ao negócio alheio e a tabela que garante o isolamento viraria a porta de entrada.

**Tech Stack:** Supabase local (CLI + Docker), PostgreSQL 15, `@supabase/supabase-js`, `@tanstack/react-query` v5, React 19, Vitest.

## Global Constraints

- **Isolamento por `negocio_id`, NUNCA por `user_id`.** Toda tabela de dado de negócio tem `negocio_id`, e toda policy usa `e_membro(negocio_id)`.
- **Toda tabela de negócio tem índice em `negocio_id`.** Sem isso o Postgres varre a tabela inteira a cada consulta com RLS e o app degrada com poucas centenas de clientes. É aqui que a escala se ganha ou se perde.
- **RLS ligada em TODAS as tabelas.** Nenhuma exceção. Não confiar em filtro no front (risco R4).
- **Ninguém tem INSERT direto em `negocio_usuarios`.** Só a RPC `criar_negocio()`, que é `SECURITY DEFINER`.
- **Preço histórico:** `lancamento_itens.preco_unitario` é COPIADO na venda. Nunca referenciar o preço atual do item (risco R2).
- **Fuso horário:** `America/Sao_Paulo` explícito em qualquer cálculo de "hoje" no banco. "Hoje" em UTC faz venda das 21h aparecer no dia seguinte (risco R5).
- **Moeda:** `NUMERIC(10,2)` no banco, sempre.
- **Escopo:** NADA de onboarding, catálogo, caixa, venda rápida ou relatório. Isso é Fase 2+. O risco R6 do plano é justamente a tentação de avançar.
- **Cor:** o contrato de cor da Fase 0 continua valendo — só tokens semânticos (`marca`, `entrada`, `saida`, `meta`, `fundo`, `superficie`, `texto`). O teste `tests/contrato-de-cor.test.ts` reprova cor crua, arbitrária ou inline.
- **Convenção:** `lib/` = puro, sem React. `hooks/` = React. Estado compartilhado = contexto, nunca cópia por componente.
- **Plataforma:** Windows, PowerShell. Ambiente não-interativo.

### Compatibilidade futura com o agente de WhatsApp (spec, seção 6)

Estas três exigências entram AGORA, no schema, porque refazer depois com clientes em
produção custa uma migração dolorosa. **Não** implemente o agente — só deixe o schema pronto.

- `lancamentos.origem TEXT NOT NULL DEFAULT 'app'` e `lancamentos.origem_msg_id TEXT NULL`,
  com `UNIQUE (negocio_id, origem_msg_id)` — webhook reentregue não vira lançamento duplicado.
- Tabela `negocio_telefones (negocio_id, telefone, verificado)` — o webhook só sabe o número
  de quem mandou a mensagem; é isto que traduz telefone → negócio.
- Toda escrita por RPC no banco, para que o app e o agente chamem a MESMA função.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/config.toml` | Config do Supabase local (gerado pelo CLI) |
| `supabase/migrations/0001_schema.sql` | Tabelas, índices, `e_membro()`, RLS, policies |
| `supabase/migrations/0002_rpc_criar_negocio.sql` | RPC `criar_negocio()` `SECURITY DEFINER` |
| `supabase/migrations/0003_trigger_receber.sql` | Trigger T1: `receber.pago` ⇄ entrada no caixa |
| `src/lib/supabase.ts` | O cliente Supabase. Único lugar que lê as env vars |
| `src/lib/queryClient.ts` | O QueryClient do TanStack Query |
| `src/types/banco.ts` | Tipos TypeScript das tabelas |
| `src/hooks/sessaoContexto.ts` | Contexto + `useSessao()` (só o hook — fast refresh) |
| `src/hooks/SessaoProvider.tsx` | Provider: escuta `onAuthStateChange` |
| `src/lib/validaLogin.ts` | Funções puras de validação de e-mail/senha |
| `src/modules/auth/Login.tsx` | Tela de login |
| `src/modules/auth/Cadastro.tsx` | Tela de cadastro |
| `src/modules/auth/Auth.tsx` | Alterna entre Login e Cadastro |
| `src/App.tsx` | Guard: sem sessão → `<Auth/>`; com sessão → o app |
| `tests/lib/validaLogin.test.ts` | Testes das funções puras |
| `tests/integracao/isolamento.test.ts` | **O teste que importa:** duas contas, RLS provada |
| `tests/integracao/trigger-receber.test.ts` | Trigger T1 provado no banco |

---

## Task 1: Supabase local de pé

**Files:**
- Create: `supabase/config.toml` (via CLI)
- Modify: `.env.local`, `.env.local.example`
- Modify: `package.json` (scripts)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada
- Produces: banco local em `http://127.0.0.1:54321`; `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env.local`; scripts `db:start`, `db:stop`, `db:reset`

- [ ] **Step 1: Inicializar o Supabase**

Run:
```powershell
npx supabase init
```
Expected: cria `supabase/config.toml` e `supabase/.gitignore`.

- [ ] **Step 2: Subir o banco local**

Run:
```powershell
npx supabase start
```
Expected: baixa as imagens Docker (demora na primeira vez) e imprime `API URL`, `anon key`, `service_role key`. Guarde os três.

Se falhar com erro de Docker, PARE e reporte — o Docker precisa estar rodando.

- [ ] **Step 3: Apontar o `.env.local` para o banco local**

`.env.local` (valores exatos que o `supabase start` imprimiu):
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<a anon key impressa pelo supabase start>
```

E `.env.local.example` passa a documentar os dois ambientes:
```
# Local (npx supabase start imprime estes valores):
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=cole-a-anon-key-do-supabase-start

# Nuvem (Supabase > Project Settings > API):
# VITE_SUPABASE_URL=https://seu-projeto.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

A `service_role` key **NUNCA** entra em `.env.local` nem no front — ela ignora a RLS.
Nos testes de integração ela é lida de variável de ambiente, nunca commitada.

- [ ] **Step 4: Scripts no `package.json`**

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset"
  }
}
```

- [ ] **Step 5: Confirmar e commitar**

Run:
```powershell
npx supabase status
```
Expected: lista os serviços rodando.

```powershell
git add -A
git commit -m "chore: supabase local (CLI + docker) e scripts de banco"
```

Confirmar com `git show --stat` que `.env.local` NÃO entrou.

---

## Task 2: Schema multi-tenant com RLS

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

**Interfaces:**
- Consumes: Supabase local da Task 1
- Produces: tabelas `negocios`, `negocio_usuarios`, `negocio_telefones`, `categorias`, `itens`, `clientes`, `lancamentos`, `lancamento_itens`, `receber`, `locacoes`, `metas`; função `e_membro(UUID) RETURNS BOOLEAN`

- [ ] **Step 1: Escrever a migração**

Create `supabase/migrations/0001_schema.sql`:
```sql
-- ============================================================
-- Autchronos — schema multi-tenant
-- O isolamento e por negocio_id, NUNCA por user_id. E isso que
-- permite virar SaaS depois sem migracao, e e isso que faz o
-- agente de WhatsApp funcionar sem login.
-- ============================================================

-- ---------- Tabelas ----------

CREATE TABLE negocios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  ramo       TEXT NOT NULL CHECK (ramo IN ('alimentacao','beleza','revenda','servicos','locacao','outro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A ponte que torna tudo multi-tenant. NINGUEM tem INSERT direto aqui
-- (ver policies abaixo): se tivesse, um usuario se adicionaria ao negocio
-- alheio e a tabela que garante o isolamento viraria a porta de entrada.
CREATE TABLE negocio_usuarios (
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel      TEXT NOT NULL DEFAULT 'dono' CHECK (papel IN ('dono','operador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (negocio_id, user_id)
);

-- Telefone -> negocio. O webhook do WhatsApp so sabe o numero de quem mandou
-- a mensagem; e aqui que isso vira um negocio. (v2 — a tabela nasce agora.)
CREATE TABLE negocio_telefones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  telefone   TEXT NOT NULL,
  verificado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (telefone)
);

CREATE TABLE categorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, nome, tipo)
);

-- O catalogo. E aqui que o MEI configura o negocio dele.
-- O estoque mora na propria linha: o item JA e a unidade de estoque.
-- ativo=false em vez de DELETE, para preservar o historico de vendas.
CREATE TABLE itens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id       UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  preco            NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidade          TEXT NOT NULL DEFAULT 'un',
  tipo             TEXT NOT NULL DEFAULT 'venda' CHECK (tipo IN ('venda','aluguel')),
  controla_estoque BOOLEAN NOT NULL DEFAULT false,
  estoque          INTEGER NOT NULL DEFAULT 0,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unifica os "clientes" do fiado com os "parceiros" B2B.
CREATE TABLE clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  telefone   TEXT,
  tipo       TEXT NOT NULL DEFAULT 'pessoa' CHECK (tipo IN ('pessoa','empresa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receber (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao   TEXT NOT NULL,
  valor       NUMERIC(10,2) NOT NULL,
  data        DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  vencimento  DATE,
  pago        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- O caixa. Coracao do app.
CREATE TABLE lancamentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  descricao     TEXT NOT NULL,
  valor         NUMERIC(10,2) NOT NULL,
  data          DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  categoria_id  UUID REFERENCES categorias(id) ON DELETE SET NULL,
  receber_id    UUID REFERENCES receber(id) ON DELETE CASCADE,
  -- De onde veio o lancamento. O WhatsApp reentrega webhook quando nao recebe
  -- confirmacao: sem o UNIQUE abaixo, uma venda de R$ 200 vira duas.
  origem        TEXT NOT NULL DEFAULT 'app' CHECK (origem IN ('app','whatsapp')),
  origem_msg_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, origem_msg_id)
);

-- Os itens vendidos naquele lancamento.
-- preco_unitario e COPIADO na venda: se o preco do item mudar amanha, o
-- historico continua correto (risco R2).
CREATE TABLE lancamento_itens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id  UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  item_id        UUID NOT NULL REFERENCES itens(id) ON DELETE RESTRICT,
  quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL
);

-- Item na rua. devolvido_em NULL = ainda esta fora.
-- A reserva de estoque e DERIVADA (soma das locacoes abertas), nao uma coluna:
-- assim nunca dessincroniza.
CREATE TABLE locacoes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id         UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES itens(id) ON DELETE RESTRICT,
  cliente_id         UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  quantidade         INTEGER NOT NULL CHECK (quantidade > 0),
  valor              NUMERIC(10,2) NOT NULL,
  data_retirada      DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  devolucao_prevista DATE NOT NULL,
  devolvido_em       DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE metas (
  negocio_id       UUID PRIMARY KEY REFERENCES negocios(id) ON DELETE CASCADE,
  meta_faturamento NUMERIC(10,2) NOT NULL DEFAULT 0,
  meta_lucro       NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Indices ----------
-- Toda tabela de negocio tem indice em negocio_id. Sem isso, cada consulta com
-- RLS varre a tabela inteira e o app degrada com poucas centenas de clientes.
-- E aqui que a escala se ganha ou se perde.

CREATE INDEX idx_negocio_usuarios_user     ON negocio_usuarios (user_id);
CREATE INDEX idx_negocio_telefones_negocio ON negocio_telefones (negocio_id);
CREATE INDEX idx_categorias_negocio        ON categorias (negocio_id);
CREATE INDEX idx_itens_negocio             ON itens (negocio_id);
CREATE INDEX idx_clientes_negocio          ON clientes (negocio_id);
CREATE INDEX idx_receber_negocio           ON receber (negocio_id);
CREATE INDEX idx_lancamentos_negocio_data  ON lancamentos (negocio_id, data DESC);
CREATE INDEX idx_lancamentos_receber       ON lancamentos (receber_id);
CREATE INDEX idx_lancamento_itens_lanc     ON lancamento_itens (lancamento_id);
CREATE INDEX idx_lancamento_itens_item     ON lancamento_itens (item_id);
CREATE INDEX idx_locacoes_negocio          ON locacoes (negocio_id);
CREATE INDEX idx_locacoes_abertas          ON locacoes (item_id) WHERE devolvido_em IS NULL;

-- ---------- e_membro(): a pergunta que TODA policy faz ----------
-- "O usuario logado e membro deste negocio?" — nunca "este user_id e o dono
-- da linha?". SECURITY DEFINER porque ela le negocio_usuarios, que tem RLS.
-- STABLE permite ao Postgres cachear o resultado dentro da query.

CREATE FUNCTION e_membro(n_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM negocio_usuarios
    WHERE negocio_id = n_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ---------- RLS ----------

ALTER TABLE negocios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE negocio_usuarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE negocio_telefones ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE receber           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamento_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas             ENABLE ROW LEVEL SECURITY;

-- negocios: ve/edita o que voce e membro. INSERT so pela RPC criar_negocio.
CREATE POLICY negocios_select ON negocios FOR SELECT TO authenticated
  USING (e_membro(id));
CREATE POLICY negocios_update ON negocios FOR UPDATE TO authenticated
  USING (e_membro(id)) WITH CHECK (e_membro(id));

-- negocio_usuarios: SELECT apenas. SEM INSERT, SEM UPDATE, SEM DELETE.
-- Um INSERT aberto aqui seria a falha de seguranca mais grave possivel:
-- qualquer usuario se adicionaria ao negocio de outra pessoa e passaria a ver
-- tudo. Quem cria o vinculo e a RPC criar_negocio (SECURITY DEFINER).
CREATE POLICY negocio_usuarios_select ON negocio_usuarios FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR e_membro(negocio_id));

-- As demais tabelas seguem todas o mesmo molde: membro do negocio pode tudo.
CREATE POLICY negocio_telefones_all ON negocio_telefones FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY categorias_all ON categorias FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY itens_all ON itens FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY clientes_all ON clientes FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY receber_all ON receber FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY lancamentos_all ON lancamentos FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY locacoes_all ON locacoes FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));
CREATE POLICY metas_all ON metas FOR ALL TO authenticated
  USING (e_membro(negocio_id)) WITH CHECK (e_membro(negocio_id));

-- lancamento_itens nao tem negocio_id (ela pende do lancamento).
-- O isolamento e herdado por join — e por isso que ela tambem precisa de policy:
-- sem isto, ela ficaria com RLS ligada e NENHUMA policy = ninguem le nada.
CREATE POLICY lancamento_itens_all ON lancamento_itens FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lancamentos l
    WHERE l.id = lancamento_id AND e_membro(l.negocio_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM lancamentos l
    WHERE l.id = lancamento_id AND e_membro(l.negocio_id)
  ));
```

- [ ] **Step 2: Aplicar e ver o banco aceitar**

Run:
```powershell
npx supabase db reset
```
Expected: `Applying migration 0001_schema.sql...` e termina sem erro.

Se o Postgres reclamar de alguma coisa, corrija a migração — NÃO edite o banco à mão.

- [ ] **Step 3: Confirmar que a RLS está ligada em todas as tabelas**

Run:
```powershell
npx supabase db reset
docker exec -i supabase_db_autchronos psql -U postgres -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
```
(Se o nome do container for outro, descubra com `docker ps --format '{{.Names}}'`.)

Expected: `rowsecurity = t` em TODAS as 11 tabelas. Qualquer `f` é falha de segurança — corrija antes de seguir.

- [ ] **Step 4: Commitar**

```powershell
git add -A
git commit -m "feat: schema multi-tenant com RLS, indices e e_membro()"
```

---

## Task 3: RPC `criar_negocio` (a única porta de entrada do vínculo)

**Files:**
- Create: `supabase/migrations/0002_rpc_criar_negocio.sql`

**Interfaces:**
- Consumes: schema da Task 2
- Produces: `criar_negocio(p_nome TEXT, p_ramo TEXT) RETURNS UUID` — cria o negócio, o vínculo de dono e a linha de metas numa transação só. Retorna o `negocio_id`.

- [ ] **Step 1: Escrever a migração**

Create `supabase/migrations/0002_rpc_criar_negocio.sql`:
```sql
-- ============================================================
-- criar_negocio(): a UNICA forma de nascer um vinculo em negocio_usuarios.
--
-- Por que SECURITY DEFINER: negocio_usuarios nao tem policy de INSERT para
-- ninguem, de proposito. Se tivesse, qualquer usuario autenticado inseriria
-- (negocio_alheio, eu_mesmo) e passaria a enxergar o negocio dos outros — a
-- tabela que garante o isolamento viraria a porta de entrada. Esta funcao roda
-- com os privilegios do dono do banco, mas so faz UMA coisa, e sempre amarra o
-- vinculo em auth.uid(): nao ha parametro de user_id para o chamador forjar.
-- ============================================================

CREATE FUNCTION criar_negocio(p_nome TEXT, p_ramo TEXT)
RETURNS UUID AS $$
DECLARE
  v_negocio_id UUID;
  v_user_id    UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'precisa estar autenticado';
  END IF;

  INSERT INTO negocios (nome, ramo)
  VALUES (p_nome, p_ramo)
  RETURNING id INTO v_negocio_id;

  INSERT INTO negocio_usuarios (negocio_id, user_id, papel)
  VALUES (v_negocio_id, v_user_id, 'dono');

  INSERT INTO metas (negocio_id) VALUES (v_negocio_id);

  RETURN v_negocio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION criar_negocio(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION criar_negocio(TEXT, TEXT) TO authenticated;
```

- [ ] **Step 2: Aplicar**

Run:
```powershell
npx supabase db reset
```
Expected: as duas migrações aplicam sem erro.

- [ ] **Step 3: Commitar**

```powershell
git add -A
git commit -m "feat: RPC criar_negocio (SECURITY DEFINER) — unica porta do vinculo"
```

---

## Task 4: Trigger T1 — "a receber" pago vira entrada no caixa

**Files:**
- Create: `supabase/migrations/0003_trigger_receber.sql`

**Interfaces:**
- Consumes: schema da Task 2
- Produces: trigger em `receber` que mantém `lancamentos` em sincronia

- [ ] **Step 1: Escrever a migração**

Create `supabase/migrations/0003_trigger_receber.sql`:
```sql
-- ============================================================
-- T1: marcar um "a receber" como pago cria a entrada no caixa.
-- Despagar remove a entrada. E idempotente: marcar pago duas vezes nao cria
-- dois lancamentos (o UPDATE so dispara quando `pago` REALMENTE muda).
-- A data usa America/Sao_Paulo: "hoje" em UTC faz o pagamento das 21h cair no
-- dia seguinte (risco R5).
-- ============================================================

CREATE FUNCTION sync_receber_lancamento() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pago AND NOT OLD.pago THEN
    INSERT INTO lancamentos (negocio_id, tipo, descricao, valor, data, receber_id)
    VALUES (
      NEW.negocio_id,
      'entrada',
      NEW.descricao,
      NEW.valor,
      (now() AT TIME ZONE 'America/Sao_Paulo')::date,
      NEW.id
    );
  ELSIF NOT NEW.pago AND OLD.pago THEN
    DELETE FROM lancamentos WHERE receber_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_receber_lancamento
  AFTER UPDATE OF pago ON receber
  FOR EACH ROW
  WHEN (OLD.pago IS DISTINCT FROM NEW.pago)
  EXECUTE FUNCTION sync_receber_lancamento();
```

- [ ] **Step 2: Aplicar**

Run:
```powershell
npx supabase db reset
```
Expected: as três migrações aplicam sem erro.

- [ ] **Step 3: Commitar**

```powershell
git add -A
git commit -m "feat: trigger T1 (a receber pago -> entrada no caixa)"
```

O trigger é PROVADO na Task 5, junto com a RLS — os dois precisam do mesmo aparato de teste.

---

## Task 5: **O teste que importa** — isolamento provado com duas contas

Esta é a task mais importante da Fase 1. O plano original diz, sobre ela: *"Isso é
segurança, não é feature — não pular."* Um erro aqui vaza o caixa de um cliente para
outro.

**Files:**
- Create: `tests/integracao/apoio.ts`
- Create: `tests/integracao/isolamento.test.ts`
- Create: `tests/integracao/trigger-receber.test.ts`
- Modify: `vite.config.ts` (aumentar o timeout: banco real é mais lento que jsdom)
- Modify: `package.json` (script `test:integracao`)

**Interfaces:**
- Consumes: migrações das Tasks 2, 3 e 4
- Produces: `criarUsuario(email, senha)` → cliente Supabase autenticado; `URL_LOCAL`, `ANON_LOCAL`

- [ ] **Step 1: Escrever o apoio dos testes**

Create `tests/integracao/apoio.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Os valores padrao do `supabase start` sao FIXOS e publicos — a anon key local
// e a mesma em toda maquina. Nao ha segredo aqui.
export const URL_LOCAL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
export const ANON_LOCAL =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/**
 * Cria um usuario NOVO e devolve um cliente ja autenticado como ele.
 * Cada teste usa e-mails unicos para nao colidir com corridas anteriores.
 */
export async function criarUsuario(): Promise<{
  cliente: SupabaseClient
  userId: string
  email: string
}> {
  const email = `teste-${crypto.randomUUID()}@autchronos.test`
  const senha = 'senha-de-teste-123'

  const cliente = createClient(URL_LOCAL, ANON_LOCAL)

  const { data, error } = await cliente.auth.signUp({ email, password: senha })
  if (error) throw new Error(`signUp falhou: ${error.message}`)
  if (!data.user) throw new Error('signUp nao devolveu usuario')

  return { cliente, userId: data.user.id, email }
}
```

- [ ] **Step 2: Escrever o teste de isolamento (vai falhar — ainda não instalamos o supabase-js)**

Create `tests/integracao/isolamento.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { criarUsuario } from './apoio'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * O teste que o plano chama de obrigatorio. Duas contas REAIS, dois negocios
 * REAIS, e a pergunta: a conta A enxerga alguma coisa da conta B?
 *
 * Se qualquer um destes testes falhar, NAO se avanca para a Fase 2. Um vazamento
 * aqui e o caixa de um cliente aparecendo para outro.
 */
describe('isolamento entre negocios (RLS)', () => {
  let alice: SupabaseClient
  let bob: SupabaseClient
  let negocioAlice: string
  let negocioBob: string

  beforeAll(async () => {
    const a = await criarUsuario()
    const b = await criarUsuario()
    alice = a.cliente
    bob = b.cliente

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

    // Alice lanca uma venda no caixa dela.
    const { error: eL } = await alice.from('lancamentos').insert({
      negocio_id: negocioAlice,
      tipo: 'entrada',
      descricao: 'Venda secreta da Alice',
      valor: 340.0,
    })
    if (eL) throw new Error(`insert do lancamento falhou: ${eL.message}`)
  })

  it('cada um enxerga o proprio negocio', async () => {
    const { data } = await alice.from('negocios').select('id, nome')
    expect(data).toHaveLength(1)
    expect(data![0].nome).toBe('Acai da Alice')
  })

  it('Bob NAO enxerga o negocio da Alice', async () => {
    const { data } = await bob.from('negocios').select('id, nome')

    expect(data).toHaveLength(1)
    expect(data![0].nome).toBe('Salao do Bob')
    expect(data!.map((n) => n.id)).not.toContain(negocioAlice)
  })

  it('Bob NAO enxerga o lancamento da Alice — nem sabendo o negocio_id dela', async () => {
    const { data } = await bob
      .from('lancamentos')
      .select('*')
      .eq('negocio_id', negocioAlice)

    // RLS nao devolve erro: devolve VAZIO. O dado simplesmente nao existe para ele.
    expect(data).toEqual([])
  })

  it('Bob NAO consegue ESCREVER no negocio da Alice', async () => {
    const { error } = await bob.from('lancamentos').insert({
      negocio_id: negocioAlice,
      tipo: 'saida',
      descricao: 'invasao',
      valor: 999.0,
    })

    expect(error).not.toBeNull()

    // E a Alice continua vendo so o lancamento dela.
    const { data } = await alice.from('lancamentos').select('descricao')
    expect(data).toHaveLength(1)
    expect(data![0].descricao).toBe('Venda secreta da Alice')
  })

  it('Bob NAO consegue se auto-adicionar ao negocio da Alice', async () => {
    // Este e o ataque que derruba o multi-tenant inteiro: se negocio_usuarios
    // aceitar INSERT, Bob vira membro do negocio da Alice e le tudo.
    const { error } = await bob.from('negocio_usuarios').insert({
      negocio_id: negocioAlice,
      user_id: (await bob.auth.getUser()).data.user!.id,
      papel: 'dono',
    })

    expect(error).not.toBeNull()

    // E, provando que o INSERT nao passou por outro caminho:
    const { data } = await bob.from('negocios').select('id')
    expect(data!.map((n) => n.id)).not.toContain(negocioAlice)
  })

  it('usuario deslogado nao le nada', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const { URL_LOCAL, ANON_LOCAL } = await import('./apoio')
    const anonimo = createClient(URL_LOCAL, ANON_LOCAL)

    const { data } = await anonimo.from('lancamentos').select('*')
    expect(data ?? []).toEqual([])
  })

  it('o negocio do Bob existe de fato (o teste nao esta passando por engano)', async () => {
    // Guarda contra o falso-positivo classico: se `criar_negocio` estivesse
    // quebrada, TODOS os testes acima passariam por vacuidade.
    expect(negocioBob).toBeTruthy()
    const { data } = await bob.from('negocios').select('nome').eq('id', negocioBob)
    expect(data).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Escrever o teste do trigger T1**

Create `tests/integracao/trigger-receber.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { criarUsuario } from './apoio'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('trigger T1: a receber pago -> entrada no caixa', () => {
  let cliente: SupabaseClient
  let negocioId: string
  let clienteId: string

  beforeAll(async () => {
    const u = await criarUsuario()
    cliente = u.cliente

    const { data: n } = await cliente.rpc('criar_negocio', {
      p_nome: 'Loja de Teste',
      p_ramo: 'revenda',
    })
    negocioId = n as string

    const { data: c, error } = await cliente
      .from('clientes')
      .insert({ negocio_id: negocioId, nome: 'Maria' })
      .select()
      .single()
    if (error) throw new Error(`insert do cliente falhou: ${error.message}`)
    clienteId = c.id
  })

  async function novaDivida(valor: number) {
    const { data, error } = await cliente
      .from('receber')
      .insert({
        negocio_id: negocioId,
        cliente_id: clienteId,
        descricao: 'Fiado da Maria',
        valor,
      })
      .select()
      .single()
    if (error) throw new Error(`insert do receber falhou: ${error.message}`)
    return data.id as string
  }

  it('criar uma divida NAO mexe no caixa', async () => {
    await novaDivida(50)

    const { data } = await cliente.from('lancamentos').select('*')
    expect(data).toEqual([])
  })

  it('marcar como pago CRIA a entrada no caixa, com o valor certo', async () => {
    const id = await novaDivida(120)

    await cliente.from('receber').update({ pago: true }).eq('id', id)

    const { data } = await cliente.from('lancamentos').select('*').eq('receber_id', id)
    expect(data).toHaveLength(1)
    expect(data![0].tipo).toBe('entrada')
    expect(Number(data![0].valor)).toBe(120)
  })

  it('marcar pago DUAS vezes nao duplica a entrada (idempotente)', async () => {
    const id = await novaDivida(70)

    await cliente.from('receber').update({ pago: true }).eq('id', id)
    await cliente.from('receber').update({ pago: true }).eq('id', id)

    const { data } = await cliente.from('lancamentos').select('*').eq('receber_id', id)
    expect(data).toHaveLength(1)
  })

  it('despagar REMOVE a entrada do caixa', async () => {
    const id = await novaDivida(90)

    await cliente.from('receber').update({ pago: true }).eq('id', id)
    await cliente.from('receber').update({ pago: false }).eq('id', id)

    const { data } = await cliente.from('lancamentos').select('*').eq('receber_id', id)
    expect(data).toEqual([])
  })
})
```

- [ ] **Step 4: Instalar o supabase-js e configurar o Vitest**

Run:
```powershell
npm install @supabase/supabase-js
```

Em `vite.config.ts`, dentro de `test`, aumentar o timeout (banco real é mais lento que jsdom):
```ts
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    testTimeout: 20000,
    hookTimeout: 30000,
  },
```
(Preservar o que já existe em `test` — não remover `environment` nem `setupFiles`.)

Em `package.json`:
```json
{
  "scripts": {
    "test:integracao": "vitest run tests/integracao"
  }
}
```

- [ ] **Step 5: Rodar os testes de integração contra o banco de verdade**

Run:
```powershell
npx supabase db reset
npm run test:integracao
```
Expected: **PASS** — 7 testes de isolamento + 4 do trigger.

Se algum teste de isolamento falhar, **PARE**. Não é bug de teste: é vazamento de dados.
Corrija a policy na migração e rode `npx supabase db reset` de novo.

- [ ] **Step 6: Rodar a suíte inteira**

Run:
```powershell
npm test
```
Expected: os 22 testes da Fase 0 + os 11 de integração = 33, todos passando.

- [ ] **Step 7: Commitar**

```powershell
git add -A
git commit -m "test: isolamento entre negocios provado com duas contas reais (RLS) + trigger T1"
```

---

## Task 6: Cliente Supabase, sessão e as telas de auth

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/queryClient.ts`
- Create: `src/lib/validaLogin.ts`
- Create: `src/types/banco.ts`
- Create: `src/hooks/sessaoContexto.ts`
- Create: `src/hooks/SessaoProvider.tsx`
- Create: `src/modules/auth/Auth.tsx`
- Create: `src/modules/auth/Login.tsx`
- Create: `src/modules/auth/Cadastro.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `tests/lib/validaLogin.test.ts`
- Test: `tests/App.test.tsx`

**Interfaces:**
- Consumes: `TemaProvider` de `@/hooks/TemaProvider`; `useTema` de `@/hooks/temaContexto`; RPC `criar_negocio` da Task 3
- Produces:
  - `supabase: SupabaseClient` (de `@/lib/supabase`)
  - `validaEmail(email: string): string | null` — devolve a mensagem de erro, ou `null` se estiver válido
  - `validaSenha(senha: string): string | null`
  - `useSessao(): { sessao: Session | null; carregando: boolean }` (de `@/hooks/sessaoContexto`)
  - `SessaoProvider` (de `@/hooks/SessaoProvider`)

- [ ] **Step 1: Escrever os testes das funções puras (falham)**

Create `tests/lib/validaLogin.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validaEmail, validaSenha } from '@/lib/validaLogin'

describe('validaEmail', () => {
  it('aceita e-mail valido', () => {
    expect(validaEmail('maria@exemplo.com')).toBeNull()
  })

  it('recusa vazio, sem arroba e sem dominio', () => {
    expect(validaEmail('')).toBe('Informe o e-mail.')
    expect(validaEmail('maria')).toBe('E-mail invalido.')
    expect(validaEmail('maria@')).toBe('E-mail invalido.')
  })

  it('ignora espaco em volta (o teclado do celular adiciona)', () => {
    expect(validaEmail('  maria@exemplo.com  ')).toBeNull()
  })
})

describe('validaSenha', () => {
  it('aceita senha com 6 ou mais caracteres', () => {
    expect(validaSenha('123456')).toBeNull()
  })

  it('recusa vazia e curta demais', () => {
    expect(validaSenha('')).toBe('Informe a senha.')
    expect(validaSenha('123')).toBe('A senha precisa de pelo menos 6 caracteres.')
  })

  it('NAO apara espaco: espaco em senha e caractere valido', () => {
    expect(validaSenha('  a  ')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run:
```powershell
npx vitest run tests/lib/validaLogin.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/validaLogin"`.

- [ ] **Step 3: Escrever as funções puras**

Create `src/lib/validaLogin.ts`:
```ts
/** Devolve a mensagem de erro, ou null quando esta valido. Puro: sem React, sem rede. */

export function validaEmail(email: string): string | null {
  const limpo = email.trim()

  if (limpo === '') return 'Informe o e-mail.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'E-mail invalido.'

  return null
}

export function validaSenha(senha: string): string | null {
  // Senha NAO leva trim: espaco e caractere valido.
  if (senha === '') return 'Informe a senha.'
  if (senha.length < 6) return 'A senha precisa de pelo menos 6 caracteres.'

  return null
}
```

- [ ] **Step 4: Rodar e ver passar**

Run:
```powershell
npx vitest run tests/lib/validaLogin.test.ts
```
Expected: PASS — 6 testes.

- [ ] **Step 5: O cliente Supabase e o QueryClient**

Create `src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias. ' +
      'Copie .env.local.example para .env.local e rode `npm run db:start`.',
  )
}

// A anon key e PUBLICA por desenho — ela vai para o bundle. Quem protege o dado
// e a RLS, nao a chave. A service_role key NUNCA pode aparecer aqui.
export const supabase = createClient(url, anonKey)
```

Create `src/lib/queryClient.ts`:
```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

Create `src/types/banco.ts`:
```ts
export type Ramo = 'alimentacao' | 'beleza' | 'revenda' | 'servicos' | 'locacao' | 'outro'
export type TipoLancamento = 'entrada' | 'saida'
export type TipoItem = 'venda' | 'aluguel'
export type TipoCliente = 'pessoa' | 'empresa'
export type Papel = 'dono' | 'operador'

export type Negocio = {
  id: string
  nome: string
  ramo: Ramo
  created_at: string
}

export type Lancamento = {
  id: string
  negocio_id: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  data: string
  categoria_id: string | null
  receber_id: string | null
  origem: 'app' | 'whatsapp'
  origem_msg_id: string | null
  created_at: string
}
```

Run:
```powershell
npm install @tanstack/react-query
```

- [ ] **Step 6: A sessão (contexto e provider separados — fast refresh)**

Create `src/hooks/sessaoContexto.ts`:
```ts
import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type ContextoSessao = {
  sessao: Session | null
  carregando: boolean
}

export const SessaoContexto = createContext<ContextoSessao | null>(null)

export function useSessao(): ContextoSessao {
  const contexto = useContext(SessaoContexto)

  if (contexto === null) {
    throw new Error('useSessao() exige que o componente esteja dentro de <SessaoProvider>.')
  }

  return contexto
}
```

Create `src/hooks/SessaoProvider.tsx`:
```tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { SessaoContexto } from '@/hooks/sessaoContexto'

/**
 * Estado UNICO da sessao, num contexto — mesmo padrao do TemaProvider.
 * `carregando` existe para nao piscar a tela de login enquanto o Supabase ainda
 * esta lendo a sessao salva: sem isso, quem ja esta logado ve o login por um
 * instante a cada recarga.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setCarregando(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const valor = useMemo(() => ({ sessao, carregando }), [sessao, carregando])

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>
}
```

- [ ] **Step 7: As telas de auth**

Create `src/modules/auth/Login.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { validaEmail, validaSenha } from '@/lib/validaLogin'

export function Login({ irParaCadastro }: { irParaCadastro: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()

    const problema = validaEmail(email) ?? validaSenha(senha)
    if (problema) {
      setErro(problema)
      return
    }

    setEnviando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error) {
      // Nao vazamos se o e-mail existe ou nao: a mesma mensagem para os dois casos.
      setErro('E-mail ou senha incorretos.')
      setEnviando(false)
    }
    // Sucesso: o SessaoProvider percebe pelo onAuthStateChange e troca a tela.
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-marca">Entrar</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="email"
        className="rounded-lg border border-marca/20 bg-superficie px-3 py-2"
      />

      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Senha"
        autoComplete="current-password"
        className="rounded-lg border border-marca/20 bg-superficie px-3 py-2"
      />

      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-marca px-3 py-2 font-display font-bold text-fundo disabled:opacity-60"
      >
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>

      <button type="button" onClick={irParaCadastro} className="text-sm text-marca underline">
        Nao tenho conta
      </button>
    </form>
  )
}
```

Create `src/modules/auth/Cadastro.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { validaEmail, validaSenha } from '@/lib/validaLogin'

export function Cadastro({ irParaLogin }: { irParaLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()

    const problema = validaEmail(email) ?? validaSenha(senha)
    if (problema) {
      setErro(problema)
      return
    }

    setEnviando(true)
    setErro(null)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
    })

    if (error) {
      setErro(error.message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-marca">Criar conta</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="email"
        className="rounded-lg border border-marca/20 bg-superficie px-3 py-2"
      />

      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Senha (min. 6 caracteres)"
        autoComplete="new-password"
        className="rounded-lg border border-marca/20 bg-superficie px-3 py-2"
      />

      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-marca px-3 py-2 font-display font-bold text-fundo disabled:opacity-60"
      >
        {enviando ? 'Criando...' : 'Criar conta'}
      </button>

      <button type="button" onClick={irParaLogin} className="text-sm text-marca underline">
        Ja tenho conta
      </button>
    </form>
  )
}
```

Create `src/modules/auth/Auth.tsx`:
```tsx
import { useState } from 'react'
import { Login } from '@/modules/auth/Login'
import { Cadastro } from '@/modules/auth/Cadastro'

export function Auth() {
  const [tela, setTela] = useState<'login' | 'cadastro'>('login')

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-marca">Autchronos</h1>
        <p className="text-sm opacity-70">
          Gestão financeira e fluxo de caixa para empreendedores
        </p>
      </div>

      {tela === 'login' ? (
        <Login irParaCadastro={() => setTela('cadastro')} />
      ) : (
        <Cadastro irParaLogin={() => setTela('login')} />
      )}
    </div>
  )
}
```

- [ ] **Step 8: O guard de sessão no App**

Replace `src/App.tsx` inteiro com:
```tsx
import { BotaoTema } from '@/components/BotaoTema'
import { TemaProvider } from '@/hooks/TemaProvider'
import { SessaoProvider } from '@/hooks/SessaoProvider'
import { useSessao } from '@/hooks/sessaoContexto'
import { Auth } from '@/modules/auth/Auth'
import { supabase } from '@/lib/supabase'

function Conteudo() {
  const { sessao, carregando } = useSessao()

  // Sem isto, quem ja esta logado ve a tela de login piscar a cada recarga.
  if (carregando) {
    return <div className="min-h-dvh bg-fundo" />
  }

  if (!sessao) {
    return <Auth />
  }

  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <header className="flex items-center justify-between border-b border-marca/15 px-5 py-4">
        <div>
          <h1 className="font-display text-xl font-bold text-marca">Autchronos</h1>
          <p className="text-sm opacity-70">{sessao.user.email}</p>
        </div>
        <div className="flex gap-2">
          <BotaoTema />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-marca/20 px-3 py-2 text-sm text-marca"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="p-5">
        <p className="opacity-70">
          Conta criada. O onboarding e o catalogo chegam na Fase 2.
        </p>
      </main>
    </div>
  )
}

function App() {
  return (
    <TemaProvider>
      <SessaoProvider>
        <Conteudo />
      </SessaoProvider>
    </TemaProvider>
  )
}

export default App
```

- [ ] **Step 9: O QueryClientProvider no main**

Em `src/main.tsx`, embrulhar o `<App />`:
```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
```
```tsx
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
```
(Preservar os imports de fonte e do `index.css` que já existem.)

- [ ] **Step 10: Atualizar o smoke test do App**

O `App` agora exige um Supabase configurado, então o teste precisa de mock.

Replace `tests/App.test.tsx` inteiro com:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// O App fala com o Supabase logo no mount. Nos testes de UI nao queremos rede:
// o que se prova aqui e o GUARD (sem sessao -> tela de login), nao o Supabase.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(),
    },
  },
}))

import App from '@/App'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('App', () => {
  it('mostra o nome e a tagline do app', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Autchronos')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Gestão financeira e fluxo de caixa para empreendedores'),
    ).toBeInTheDocument()
  })

  it('sem sessao, o guard mostra a tela de login — e NAO o app', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 11: Rodar tudo**

Run:
```powershell
npm test
npm run build
npx oxlint
```
Expected: todos os testes passando (os da Fase 0, os de integração, os de `validaLogin` e os dois do App), build limpo, lint sem avisos.

- [ ] **Step 12: Verificar no navegador de verdade**

Run `npm run dev` (o usuário roda — não o agente) e conferir:
1. A tela de login aparece, com a identidade do Autchronos.
2. Criar uma conta funciona e o app troca para a tela logada, mostrando o e-mail.
3. "Sair" volta para o login.
4. Recarregar a página com sessão ativa **não** pisca a tela de login.

- [ ] **Step 13: Commitar**

```powershell
git add -A
git commit -m "feat: cliente supabase, sessao em contexto, login/cadastro e guard"
```

---

## Entrega da Fase 1

- Banco Postgres multi-tenant, com RLS ligada nas 11 tabelas e índice em `negocio_id` em todas
- `e_membro()` como a única pergunta que as policies fazem
- `criar_negocio()` como a única porta de entrada de `negocio_usuarios` — ninguém se auto-adiciona ao negócio alheio
- Trigger T1 provado: pagar cria a entrada, despagar remove, marcar duas vezes não duplica
- **Isolamento provado com duas contas reais** — inclusive contra o ataque de auto-adição
- Cadastro, login, logout e guard de sessão funcionando
- Schema já compatível com o agente de WhatsApp (origem, `origem_msg_id` único, `negocio_telefones`)

**Fora do escopo:** onboarding, templates de ramo, catálogo, caixa, venda rápida. Fase 2.
