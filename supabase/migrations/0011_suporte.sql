-- ============================================================
-- Fase 5.8: suporte e sugestoes. Usuario insere/le SOMENTE as proprias;
-- o dono le tudo via service_role (dashboard).
-- ============================================================
CREATE TABLE suporte (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID REFERENCES negocios(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL DEFAULT auth.uid(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('pergunta','sugestao')),
  mensagem    TEXT NOT NULL,
  contato     TEXT,
  status      TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','respondido','resolvido')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_suporte_user ON suporte (user_id, created_at DESC);

ALTER TABLE suporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY suporte_insere ON suporte FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY suporte_le_proprias ON suporte FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT ON suporte TO authenticated;
