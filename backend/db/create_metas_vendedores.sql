-- Tabela de metas dos vendedores
-- Armazena metas mensais de propostas e valor para cada vendedor

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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_ano ON metas_vendedores(vendedor_id, ano);
CREATE INDEX IF NOT EXISTS idx_metas_ano_mes ON metas_vendedores(ano, mes);

-- Comentários
COMMENT ON TABLE metas_vendedores IS 'Metas mensais de vendedores (propostas e valor)';
COMMENT ON COLUMN metas_vendedores.vendedor_id IS 'ID do vendedor (FK para app_users)';
COMMENT ON COLUMN metas_vendedores.ano IS 'Ano da meta (ex: 2025)';
COMMENT ON COLUMN metas_vendedores.mes IS 'Mês da meta (1-12)';
COMMENT ON COLUMN metas_vendedores.meta_propostas IS 'Meta de quantidade de propostas no mês';
COMMENT ON COLUMN metas_vendedores.meta_valor IS 'Meta de valor total de propostas no mês';
