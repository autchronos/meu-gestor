-- ============================================================
-- Deltas da fase de dominio (aplicados ja na Fase 2 -- principio D1):
-- carteira PF/PJ + retirada, metas de pro-labore/reserva, taxa no a receber,
-- e o trigger passando a lancar o valor LIQUIDO no caixa.
-- ============================================================

-- ---------- lancamentos: carteira e retirada ----------
ALTER TABLE lancamentos
  ADD COLUMN carteira TEXT NOT NULL DEFAULT 'empresa'
    CHECK (carteira IN ('empresa','pessoal')),
  ADD COLUMN eh_retirada BOOLEAN NOT NULL DEFAULT false;

-- Retirada = tipo='saida', carteira='empresa', eh_retirada=true (nao e despesa
-- do negocio). Indice para a tela "Minhas retiradas".
CREATE INDEX idx_lancamentos_retiradas
  ON lancamentos (negocio_id, data DESC) WHERE eh_retirada;

-- ---------- metas: pro-labore e reserva ----------
ALTER TABLE metas
  ADD COLUMN limite_prolabore NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN reserva_alvo     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN reserva_prazo    DATE,
  ADD COLUMN valor_reservado  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN saldo_minimo     NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ---------- receber: forma de pagamento e taxa ----------
ALTER TABLE receber
  ADD COLUMN forma_pagamento TEXT,
  ADD COLUMN taxa            NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ---------- trigger: lancar o LIQUIDO (descontada a taxa) ----------
-- Substitui a versao do 0003. Mantem idempotencia e o fuso America/Sao_Paulo.
CREATE OR REPLACE FUNCTION sync_receber_lancamento() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pago AND NOT OLD.pago THEN
    INSERT INTO lancamentos (negocio_id, tipo, descricao, valor, data, receber_id)
    VALUES (
      NEW.negocio_id,
      'entrada',
      NEW.descricao,
      ROUND(NEW.valor * (1 - COALESCE(NEW.taxa, 0) / 100), 2),
      (now() AT TIME ZONE 'America/Sao_Paulo')::date,
      NEW.id
    );
  ELSIF NOT NEW.pago AND OLD.pago THEN
    DELETE FROM lancamentos WHERE receber_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
