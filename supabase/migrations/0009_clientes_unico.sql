-- ============================================================
-- Fase 4: suporte a contas a receber + clientes sem duplicar.
-- ============================================================
-- Cliente unico por negocio (case-insensitive) -> "busca-ou-cria" limpo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_negocio_nome
  ON clientes (negocio_id, lower(nome));

-- Lista de contas abertas ordenada por vencimento.
CREATE INDEX IF NOT EXISTS idx_receber_negocio_pago_venc
  ON receber (negocio_id, pago, vencimento);
