-- =============================================
-- ADICIONAR COLUNA: desconto_desejado
-- Na tabela solicitacoes_desconto
-- Permite que o vendedor informe o % desejado
-- =============================================

ALTER TABLE solicitacoes_desconto 
ADD COLUMN IF NOT EXISTS desconto_desejado NUMERIC;

COMMENT ON COLUMN solicitacoes_desconto.desconto_desejado IS 'Percentual de desconto desejado pelo vendedor';
