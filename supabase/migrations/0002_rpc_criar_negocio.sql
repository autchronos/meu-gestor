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
