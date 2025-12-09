-- ============================================================================
-- SCRIPT: Adicionar coluna regioes_operacao na tabela users
-- DATA: Dezembro 2025
-- DESCRIÇÃO: Permite que vendedores internos atendam múltiplas regiões
-- ============================================================================

-- 1. Adicionar coluna regioes_operacao (array de texto)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS regioes_operacao TEXT[] DEFAULT '{}';

-- 2. Adicionar comentário explicativo
COMMENT ON COLUMN users.regioes_operacao IS 'Array de grupos de região que o vendedor pode atender. Exemplo: ["Sul-Sudeste", "Centro-Oeste", "RS com Inscrição Estadual"]';

-- 3. Criar índice para melhor performance em buscas
CREATE INDEX IF NOT EXISTS idx_users_regioes_operacao 
ON users USING GIN (regioes_operacao);

-- ============================================================================
-- EXEMPLOS DE USO
-- ============================================================================

-- IMPORTANTE: Use os GRUPOS DE REGIÃO (igual aos preços dos guindastes)
-- Grupos disponíveis:
--   - 'Norte-Nordeste'
--   - 'Centro-Oeste'
--   - 'Sul-Sudeste'
--   - 'RS com Inscrição Estadual'
--   - 'RS sem Inscrição Estadual'

-- Exemplo 1: Vendedor regional (apenas 1 região)
-- UPDATE users 
-- SET regioes_operacao = ARRAY['Sul-Sudeste']
-- WHERE id = 'uuid-do-vendedor-rs';

-- Exemplo 2: Vendedor interno (múltiplas regiões)
-- UPDATE users 
-- SET regioes_operacao = ARRAY['Sul-Sudeste', 'Centro-Oeste', 'RS com Inscrição Estadual', 'RS sem Inscrição Estadual']
-- WHERE id = 'uuid-do-vendedor-interno';

-- Exemplo 3: Vendedor sem regiões específicas (usa apenas região principal)
-- UPDATE users 
-- SET regioes_operacao = '{}'
-- WHERE id = 'uuid-do-vendedor';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Ver estrutura da tabela
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'regioes_operacao';

-- Ver dados dos vendedores
-- SELECT id, nome, regiao, regioes_operacao 
-- FROM users 
-- WHERE tipo = 'vendedor';
