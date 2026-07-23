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
