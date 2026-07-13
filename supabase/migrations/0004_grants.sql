-- ============================================================
-- GRANTs: a camada ABAIXO da RLS.
--
-- Policy de RLS nao concede permissao — ela apenas RESTRINGE quem ja tem.
-- Sem GRANT, o Postgres responde "permission denied" antes mesmo de olhar a
-- policy. Foi exatamente o que aconteceu: as policies estavam corretas e nada
-- funcionava, porque o papel `authenticated` nao tinha privilegio nenhum.
--
-- Sao DUAS camadas, e as duas precisam estar certas:
--   GRANT  -> "este papel PODE tocar nesta tabela"
--   POLICY -> "...mas so nas linhas do negocio de que ele e membro"
--
-- O papel `anon` (visitante deslogado) NAO recebe nada. Deslogado nao le, nao
-- escreve, nao existe para o banco.
-- ============================================================

-- O usuario logado opera as tabelas do proprio negocio. Quais LINHAS ele
-- alcanca, quem decide sao as policies de e_membro() da migracao 0001.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  negocios,
  negocio_telefones,
  categorias,
  itens,
  clientes,
  receber,
  lancamentos,
  lancamento_itens,
  locacoes,
  metas
TO authenticated;

-- negocio_usuarios e a excecao deliberada: SOMENTE LEITURA, e so.
-- Ela e a ponte que define quem pertence a qual negocio. Se o usuario pudesse
-- escrever aqui, ele se adicionaria ao negocio alheio e leria o caixa dos
-- outros. O vinculo nasce APENAS dentro da RPC criar_negocio (SECURITY DEFINER).
--
-- Note a defesa em profundidade: esta tabela ja nao tem policy de INSERT, e
-- agora tambem nao tem GRANT de INSERT. As duas camadas dizem nao.
GRANT SELECT ON negocio_usuarios TO authenticated;

-- E o deslogado? Nada. Nenhum GRANT para `anon`, de proposito.
