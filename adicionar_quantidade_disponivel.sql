-- ✅ ADICIONAR CAMPO quantidade_disponivel NA TABELA guindastes
-- Executar este SQL no Supabase SQL Editor

-- 1. Adicionar coluna quantidade_disponivel (padrão 0)
ALTER TABLE guindastes 
ADD COLUMN IF NOT EXISTS quantidade_disponivel INTEGER DEFAULT 0;

-- 2. Adicionar comentário para documentação
COMMENT ON COLUMN guindastes.quantidade_disponivel IS 'Quantidade de equipamentos disponíveis em estoque para pronta entrega';

-- 3. Verificar se a coluna foi criada com sucesso
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'guindastes' 
AND column_name = 'quantidade_disponivel';

-- 4. (Opcional) Atualizar alguns registros para teste
-- UPDATE guindastes SET quantidade_disponivel = 5 WHERE id IN (1, 2, 3);
-- UPDATE guindastes SET quantidade_disponivel = 0 WHERE id IN (4, 5);

SELECT 'Campo quantidade_disponivel adicionado com sucesso!' as status;
