-- ============================================================
-- CONTROLE DE ESTOQUE - Colunas necessarias na tabela PROPOSTAS
-- Execute este SQL no banco de dados (Supabase SQL Editor ou psql)
-- ============================================================

-- 1. Adicionar coluna id_guindaste na tabela propostas
ALTER TABLE propostas
ADD COLUMN IF NOT EXISTS id_guindaste INTEGER;

-- 2. Adicionar coluna estoque_descontado (evita baixa duplicada)
ALTER TABLE propostas
ADD COLUMN IF NOT EXISTS estoque_descontado BOOLEAN DEFAULT FALSE;

-- 3. Indice para consultas
CREATE INDEX IF NOT EXISTS idx_propostas_id_guindaste
ON propostas(id_guindaste);

-- 4. Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'propostas'
AND column_name IN ('id_guindaste', 'estoque_descontado')
ORDER BY column_name;
