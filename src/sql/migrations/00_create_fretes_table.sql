-- Criação da tabela de fretes
-- Esta tabela armazena os valores de frete por cidade/oficina
-- com duas opções: prioridade (entrega exclusiva) e reaproveitamento (carga compartilhada)
-- Execute este script ANTES de qualquer outro script de fretes

-- Verificar se a tabela já existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fretes') THEN
        CREATE TABLE fretes (
            id SERIAL PRIMARY KEY,
            cidade VARCHAR(100) NOT NULL,
            oficina VARCHAR(200) NOT NULL,
            uf VARCHAR(2) NOT NULL,
            regiao_grupo VARCHAR(50) NOT NULL DEFAULT 'sul-sudeste',
            valor_prioridade DECIMAL(10,2) NOT NULL DEFAULT 0,
            valor_reaproveitamento DECIMAL(10,2) NOT NULL DEFAULT 0,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Garantir que pelo menos um valor seja maior que zero
            CONSTRAINT check_valores CHECK (valor_prioridade >= 0 AND valor_reaproveitamento >= 0),
            
            -- Índice único por oficina, cidade e UF
            CONSTRAINT unique_frete_oficina_cidade_uf UNIQUE (oficina, cidade, uf)
        );
        
        -- Criar índices para busca rápida
        CREATE INDEX idx_fretes_cidade ON fretes(cidade);
        CREATE INDEX idx_fretes_uf ON fretes(uf);
        CREATE INDEX idx_fretes_regiao_grupo ON fretes(regiao_grupo);
        CREATE INDEX idx_fretes_oficina ON fretes(oficina);
        
        -- Adicionar comentários
        COMMENT ON TABLE fretes IS 'Valores de frete por cidade, oficina e região';
        COMMENT ON COLUMN fretes.uf IS 'Unidade Federativa (estado) da oficina';
        COMMENT ON COLUMN fretes.regiao_grupo IS 'Grupo de região para filtrar por vendedor: norte-nordeste, centro-oeste, sul-sudeste, rs-com-ie, rs-sem-ie';
        COMMENT ON COLUMN fretes.valor_prioridade IS 'Valor cobrado quando o caminhão leva apenas aquele equipamento (entrega exclusiva)';
        COMMENT ON COLUMN fretes.valor_reaproveitamento IS 'Valor cobrado quando espera formar carga completa (mais econômico)';
        
        RAISE NOTICE '✅ Tabela fretes criada com sucesso!';
    ELSE
        RAISE NOTICE '⚠️ Tabela fretes já existe, pulando criação';
    END IF;
END $$;

-- Verificar a criação
SELECT 
    tablename, 
    schemaname 
FROM pg_tables 
WHERE tablename = 'fretes';

-- Mostrar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'fretes'
ORDER BY ordinal_position;

