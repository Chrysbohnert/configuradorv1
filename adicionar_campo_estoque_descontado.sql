-- ✅ ADICIONAR CONTROLE DE ESTOQUE NOS PEDIDOS
-- Este campo rastreia se o pedido já descontou do estoque

-- 1. Adicionar campo na tabela pedidos
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS estoque_descontado BOOLEAN DEFAULT FALSE;

-- 2. Adicionar comentário
COMMENT ON COLUMN pedidos.estoque_descontado IS 'Indica se este pedido já descontou uma unidade do estoque disponível';

-- 3. Verificar
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
AND column_name = 'estoque_descontado';

SELECT '✅ Campo estoque_descontado adicionado com sucesso!' as status;
