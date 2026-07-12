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
