-- ============================================
-- MIGRATION: Adicionar campo uso_interno_stark
-- ============================================
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- com o usuário postgres (proprietário da tabela)

-- Adicionar campo uso_interno_stark para permitir que Stark faça pedidos em nome de concessionárias
-- Este campo identifica usuários/concessionárias que podem fazer pedidos para outras concessionárias

ALTER TABLE public.concessionarias 
ADD COLUMN IF NOT EXISTS uso_interno_stark BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN public.concessionarias.uso_interno_stark IS 'Indica se esta concessionária/usuário pode fazer pedidos em nome de outras concessionárias (uso interno da Stark)';

-- Verificar se a coluna foi criada com sucesso
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'concessionarias' 
AND column_name = 'uso_interno_stark';
