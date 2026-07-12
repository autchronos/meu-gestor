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
