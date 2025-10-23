-- ✅ CRIAR COLUNAS PARA CONTROLE DE ESTOQUE NA TABELA PEDIDOS
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna id_guindaste (referência ao guindaste do pedido)
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS id_guindaste INTEGER;

-- 2. Adicionar coluna estoque_descontado (controle se já descontou)
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS estoque_descontado BOOLEAN DEFAULT FALSE;

-- 3. Adicionar foreign key para guindastes (opcional mas recomendado)
ALTER TABLE pedidos 
ADD CONSTRAINT fk_pedidos_guindaste 
FOREIGN KEY (id_guindaste) 
REFERENCES guindastes(id) 
ON DELETE SET NULL;

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN pedidos.id_guindaste IS 'ID do guindaste principal do pedido (para controle de estoque)';
COMMENT ON COLUMN pedidos.estoque_descontado IS 'Indica se este pedido já descontou uma unidade do estoque';

-- 5. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_pedidos_id_guindaste 
ON pedidos(id_guindaste);

CREATE INDEX IF NOT EXISTS idx_pedidos_estoque_descontado 
ON pedidos(estoque_descontado);

-- 6. Verificar se as colunas foram criadas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
AND column_name IN ('id_guindaste', 'estoque_descontado')
ORDER BY column_name;

-- 7. Ver estrutura completa da tabela pedidos
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
ORDER BY ordinal_position;

SELECT '✅ Colunas id_guindaste e estoque_descontado criadas com sucesso!' as status;
