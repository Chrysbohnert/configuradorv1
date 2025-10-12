-- Migração: Adicionar colunas UF e região_grupo na tabela fretes
-- Data: 2025-10-12
-- Descrição: Adiciona suporte para filtrar pontos de instalação por região do vendedor

-- 1. Adicionar coluna UF (obrigatória)
ALTER TABLE fretes 
ADD COLUMN IF NOT EXISTS uf VARCHAR(2) NOT NULL DEFAULT 'RS';

-- 2. Adicionar coluna regiao_grupo para mapear agrupamentos de regiões
-- Valores possíveis: 'norte-nordeste', 'centro-oeste', 'sul-sudeste', 'rs-com-ie', 'rs-sem-ie'
ALTER TABLE fretes 
ADD COLUMN IF NOT EXISTS regiao_grupo VARCHAR(50) NOT NULL DEFAULT 'sul-sudeste';

-- 3. Criar índice para busca por UF
CREATE INDEX IF NOT EXISTS idx_fretes_uf ON fretes(uf);

-- 4. Criar índice para busca por região_grupo
CREATE INDEX IF NOT EXISTS idx_fretes_regiao_grupo ON fretes(regiao_grupo);

-- 5. Atualizar registros existentes do RS
UPDATE fretes 
SET uf = 'RS', 
    regiao_grupo = 'rs-com-ie'  -- Por padrão, RS com IE (pode ser ajustado no código)
WHERE uf = 'RS' OR cidade IN (
    'Santa Rosa', 'Pelotas', 'São José do Inhacorá', 'Santa Maria', 
    'Canoas', 'Alvorada', 'Nova Prata', 'Santo Antônio da Patrulha',
    'Caxias do Sul', 'Erechim', 'Não-Me-Toque', 'Carazinho',
    'Alegrete', 'Santo Ângelo', 'Cândido Godói'
);

-- 6. Remover constraint antiga se existir e criar nova incluindo UF
ALTER TABLE fretes DROP CONSTRAINT IF EXISTS unique_frete_cidade_oficina;
ALTER TABLE fretes ADD CONSTRAINT unique_frete_oficina_cidade_uf UNIQUE (oficina, cidade, uf);

-- 7. Adicionar comentários
COMMENT ON COLUMN fretes.uf IS 'Unidade Federativa (estado) da oficina';
COMMENT ON COLUMN fretes.regiao_grupo IS 'Grupo de região para filtrar por vendedor: norte-nordeste, centro-oeste, sul-sudeste, rs-com-ie, rs-sem-ie';

-- 8. Verificar registros atualizados
SELECT 
    oficina, 
    cidade, 
    uf, 
    regiao_grupo, 
    valor_prioridade, 
    valor_reaproveitamento 
FROM fretes 
ORDER BY uf, cidade;

