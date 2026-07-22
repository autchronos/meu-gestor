-- ============================================================
-- Fase 5.9: resposta do admin ao suporte. Admin escreve via service_role
-- (apos ehAdmin no servidor); o usuario le a propria linha (RLS own-row 0011).
-- ============================================================
ALTER TABLE suporte ADD COLUMN IF NOT EXISTS resposta       TEXT;
ALTER TABLE suporte ADD COLUMN IF NOT EXISTS respondido_em  TIMESTAMPTZ;
