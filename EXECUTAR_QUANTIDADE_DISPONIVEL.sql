-- ✅ SCRIPT PARA ADICIONAR quantidade_disponivel NA TABELA guindastes
-- ⚠️ EXECUTAR ESTE SQL NO SUPABASE SQL EDITOR

-- 1. Verificar se a coluna já existe e remover se necessário
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'guindastes' 
        AND column_name = 'quantidade_disponivel'
    ) THEN
        ALTER TABLE guindastes DROP COLUMN quantidade_disponivel;
        RAISE NOTICE 'Coluna quantidade_disponivel removida (será recriada)';
    END IF;
END $$;

-- 2. Adicionar coluna quantidade_disponivel como INTEGER com default 0
ALTER TABLE guindastes 
ADD COLUMN quantidade_disponivel INTEGER NOT NULL DEFAULT 0;

-- 3. Adicionar comentário para documentação
COMMENT ON COLUMN guindastes.quantidade_disponivel IS 'Quantidade de equipamentos disponíveis em estoque para pronta entrega';

-- 4. Criar índice para melhor performance (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_guindastes_quantidade_disponivel 
ON guindastes(quantidade_disponivel);

-- 5. Verificar se a coluna foi criada corretamente
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'guindastes' 
AND column_name = 'quantidade_disponivel';

-- 6. (OPCIONAL) Atualizar alguns registros para teste
-- Descomente as linhas abaixo para testar:
-- UPDATE guindastes SET quantidade_disponivel = 5 WHERE id = 1;
-- UPDATE guindastes SET quantidade_disponivel = 3 WHERE id = 2;
-- UPDATE guindastes SET quantidade_disponivel = 0 WHERE id = 3;

-- 7. Verificar os dados atualizados
SELECT id, subgrupo, modelo, quantidade_disponivel 
FROM guindastes 
ORDER BY id 
LIMIT 10;

-- ✅ Mensagem de sucesso
SELECT '✅ Campo quantidade_disponivel criado com sucesso como INTEGER!' as status;
