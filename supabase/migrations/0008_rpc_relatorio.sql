-- ============================================================
-- Relatorio: faturamento (entradas) e custos (saidas nao-retirada) por intervalo.
-- ============================================================
CREATE OR REPLACE FUNCTION relatorio(p_negocio_id UUID, p_de DATE, p_ate DATE)
RETURNS JSONB AS $$
BEGIN
  IF NOT e_membro(p_negocio_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  RETURN jsonb_build_object(
    'faturamento', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa' AND tipo = 'entrada'
        AND data >= p_de AND data <= p_ate), 0),
    'custos', COALESCE((
      SELECT SUM(valor) FROM lancamentos
      WHERE negocio_id = p_negocio_id AND carteira = 'empresa' AND tipo = 'saida'
        AND NOT eh_retirada AND data >= p_de AND data <= p_ate), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION relatorio(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION relatorio(UUID, DATE, DATE) TO authenticated;
