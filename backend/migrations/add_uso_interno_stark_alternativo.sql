-- ============================================
-- MIGRATION ALTERNATIVA: uso_interno_stark
-- ============================================
-- Use este script se o principal der erro de permissão

-- Verificar se a coluna já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'concessionarias' 
        AND column_name = 'uso_interno_stark'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE public.concessionarias 
        ADD COLUMN uso_interno_stark BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Coluna uso_interno_stark adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna uso_interno_stark já existe!';
    END IF;
END $$;

-- Adicionar comentário (se der erro, pode ignorar)
DO $$ 
BEGIN
    EXECUTE 'COMMENT ON COLUMN public.concessionarias.uso_interno_stark IS ''Indica se esta concessionária/usuário pode fazer pedidos em nome de outras concessionárias (uso interno da Stark)''';
    RAISE NOTICE 'Comentário adicionado com sucesso!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível adicionar comentário (pode ignorar): %', SQLERRM;
END $$;

-- Verificar resultado final
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'concessionarias' 
AND column_name = 'uso_interno_stark';
