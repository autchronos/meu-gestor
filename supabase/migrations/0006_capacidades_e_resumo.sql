-- ============================================================
-- Capacidades por negocio (feature flags) + RPC de resumo do dashboard.
-- ============================================================

ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS usa_estoque   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_fiado     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_locacao   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usa_carteiras BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS usa_metas     BOOLEAN NOT NULL DEFAULT true;

-- Numeros-cabecalho do dashboard, por agregacao SQL. SECURITY DEFINER + e_membro
-- garante o isolamento. Retiradas reduzem o disponivel (saida da carteira
-- empresa) mas NAO entram em saidas_mes (nao sao despesa).
CREATE OR REPLACE FUNCTION resumo_dashboard(p_negocio_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_hoje    DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_ini_mes DATE := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
  IF NOT e_membro(p_negocio_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  RETURN jsonb_build_object(
    'disponivel', COALESCE((
      SELECT SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END)
      FROM lancamentos WHERE negocio_id = p_negocio_id AND carteira = 'empresa'), 0),
    'a_receber', COALESCE((
      SELECT SUM(valor) FROM receber
      WHERE negocio_id = p_negocio_id AND NOT pago), 0),
    'entradas_mes', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa'
        AND tipo = 'entrada' AND data >= v_ini_mes), 0),
    'saidas_mes', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa'
        AND tipo = 'saida' AND NOT eh_retirada AND data >= v_ini_mes), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION resumo_dashboard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resumo_dashboard(UUID) TO authenticated;
