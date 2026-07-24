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

-- GRANT: camada abaixo da RLS. Sem isto o server action conectarWhatsApp (papel
-- authenticated) toma "permission denied" e a vinculacao nunca gera codigo.
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_verificacoes TO authenticated;

-- Nota: a resolucao telefone -> negocio no webhook busca por `telefone`, que ja
-- tem UNIQUE (indexado) desde a 0001 — nao precisa de indice adicional.

-- Saldo disponivel (empresa) somado NO SERVIDOR. Evita o limite de 1000 linhas
-- do PostgREST, que truncaria uma soma feita no cliente. SEM e_membro: e chamada
-- SO pelo webhook via service_role (auth.uid() e NULL ali). Por isso REVOKE de
-- todos e GRANT so a service_role — um usuario authenticated nao pode ler saldo
-- alheio passando um negocio_id arbitrario.
CREATE OR REPLACE FUNCTION saldo_empresa(p_negocio_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
  FROM lancamentos
  WHERE negocio_id = p_negocio_id AND carteira = 'empresa';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION saldo_empresa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION saldo_empresa(UUID) TO service_role;
