-- ============================================================
-- Fase 5A: estoque minimo + baixa/devolucao automatica na venda.
-- ============================================================
ALTER TABLE itens ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER NOT NULL DEFAULT 0;

-- Baixa o estoque quando um item entra numa venda; devolve quando sai
-- (inclusive no ON DELETE CASCADE ao excluir o lancamento). So itens que
-- controlam estoque. RETURN NULL: e AFTER, o retorno e ignorado.
CREATE OR REPLACE FUNCTION sync_estoque_venda() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE itens SET estoque = estoque - NEW.quantidade
      WHERE id = NEW.item_id AND controla_estoque;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE itens SET estoque = estoque + OLD.quantidade
      WHERE id = OLD.item_id AND controla_estoque;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_estoque_venda ON lancamento_itens;
CREATE TRIGGER trg_sync_estoque_venda
  AFTER INSERT OR DELETE ON lancamento_itens
  FOR EACH ROW EXECUTE FUNCTION sync_estoque_venda();
