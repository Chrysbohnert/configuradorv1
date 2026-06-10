-- ============================================
-- SETUP COMPLETO DA TABELA METAS_VENDEDORES
-- ============================================
-- Execute este arquivo completo no seu banco PostgreSQL

-- 1. CRIAR A TABELA
CREATE TABLE IF NOT EXISTS metas_vendedores (
  id SERIAL PRIMARY KEY,
  vendedor_id INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  meta_propostas INTEGER DEFAULT 0,
  meta_valor NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint única: um vendedor só pode ter uma meta por mês/ano
  CONSTRAINT unique_vendedor_ano_mes UNIQUE (vendedor_id, ano, mes),
  
  -- Foreign key para app_users
  CONSTRAINT fk_vendedor FOREIGN KEY (vendedor_id) 
    REFERENCES app_users(id) 
    ON DELETE CASCADE
);

-- 2. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_ano ON metas_vendedores(vendedor_id, ano);
CREATE INDEX IF NOT EXISTS idx_metas_ano_mes ON metas_vendedores(ano, mes);

-- 3. CONCEDER PERMISSÕES
-- Concede permissões para o usuário atual
GRANT ALL PRIVILEGES ON TABLE metas_vendedores TO CURRENT_USER;
GRANT USAGE, SELECT ON SEQUENCE metas_vendedores_id_seq TO CURRENT_USER;

-- Se você usa um usuário específico (ex: postgres), descomente a linha abaixo:
-- GRANT ALL PRIVILEGES ON TABLE metas_vendedores TO postgres;
-- GRANT USAGE, SELECT ON SEQUENCE metas_vendedores_id_seq TO postgres;

-- 4. VERIFICAR SE FOI CRIADO COM SUCESSO
SELECT 
  'Tabela criada com sucesso!' as status,
  COUNT(*) as total_registros 
FROM metas_vendedores;

-- 5. VERIFICAR PERMISSÕES
SELECT 
  'Permissões concedidas:' as info,
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'metas_vendedores';
