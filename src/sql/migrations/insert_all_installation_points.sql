-- Inserção de todos os pontos de instalação com valores de frete
-- Data: 2025-10-12
-- Fonte: Planilhas fornecidas pelo cliente

-- IMPORTANTE: Execute primeiro a migração add_uf_regiao_to_fretes.sql

-- ============================================
-- RIO GRANDE DO SUL (RS)
-- Região: RS com IE / RS sem IE
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Agiltec', 'Santa Rosa', 'RS', 'rs-com-ie', 16.00, 0.00),
('Rodokurtz', 'Pelotas', 'RS', 'rs-com-ie', 5824.00, 3000.00),
('Hidroen Guindastes', 'São José do Inhacorá', 'RS', 'rs-com-ie', 360.00, 250.00),
('Trevisan', 'Santa Maria', 'RS', 'rs-com-ie', 2160.00, 1500.00),
('Berto', 'Canoas', 'RS', 'rs-com-ie', 3840.00, 2000.00),
('Guindas Move', 'Alvorada', 'RS', 'rs-com-ie', 4000.00, 2000.00),
('Salex', 'Nova Prata', 'RS', 'rs-com-ie', 3080.00, 1800.00),
('Guindasmap', 'Santo Antônio da Patrulha', 'RS', 'rs-com-ie', 4464.00, 2200.00),
('VRC Manutenções', 'Caxias do Sul', 'RS', 'rs-com-ie', 3824.00, 2000.00),
('BGS Implementos', 'Erechim', 'RS', 'rs-com-ie', 2784.00, 1800.00),
('R.D.P. Soluções Hidráulicas', 'Não-Me-Toque', 'RS', 'rs-com-ie', 1952.00, 1500.00),
('KM Prestação de Serviço Mecânico', 'Carazinho', 'RS', 'rs-com-ie', 1800.00, 1500.00),
('Mecânica Acosta', 'Alegrete', 'RS', 'rs-com-ie', 2744.00, 1800.00),
('KIST Oficina de Furgões', 'Santo Ângelo', 'RS', 'rs-com-ie', 500.00, 500.00),
('Henz & Cassola Comércio', 'Cândido Godói', 'RS', 'rs-com-ie', 500.00, 500.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- PARANÁ (PR)
-- Região: Sul-Sudeste
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Hidraumap', 'Sarandi', 'PR', 'sul-sudeste', 6568.00, 3000.00),
('Mecânica R.E.I', 'Cascavel', 'PR', 'sul-sudeste', 4096.00, 2500.00),
('Tormec', 'Candói', 'PR', 'sul-sudeste', 4000.00, 2000.00),
('W.R. Tornearia', 'Pitanga', 'PR', 'sul-sudeste', 5136.00, 2500.00),
('Hidráulico MHF', 'Marechal Cândido Rondon', 'PR', 'sul-sudeste', 4672.00, 2500.00),
('Bertochi', 'Pranchita', 'PR', 'sul-sudeste', 2728.00, 1500.00),
('Master Plus', 'Cambé', 'PR', 'sul-sudeste', 6920.00, 3500.00),
('Sorasa Truck Center', 'Palotina', 'PR', 'sul-sudeste', 4800.00, 2500.00),
('ParanaSul', 'Fazenda Rio Grande', 'PR', 'sul-sudeste', 6576.00, 3500.00),
('JVB Caminhões', 'Ponta Grossa', 'PR', 'sul-sudeste', 5784.00, 3000.00),
('Tornearia Mantovani', 'Turvo', 'PR', 'sul-sudeste', 4888.00, 2500.00),
('Carroceria Fernandes', 'São Miguel do Iguaçu', 'PR', 'sul-sudeste', 4584.00, 2500.00),
('Hidráulico Marmeleiro', 'Marmeleiro', 'PR', 'sul-sudeste', 2784.00, 1500.00),
('RM Guindastes', 'Pinhais', 'PR', 'sul-sudeste', 6040.00, 3000.00),
('Agrosolo Máquinas', 'Chopinzinho', 'PR', 'sul-sudeste', 2400.00, 1500.00),
('Paraná Diesel', 'São João', 'PR', 'sul-sudeste', 3312.00, 2000.00),
('Mecânica Iguaçu', 'São Jorge d''Oeste', 'PR', 'sul-sudeste', 3440.00, 2000.00),
('Hilgert Comercio de Peças Agrícolas Ltda', 'Ibema', 'PR', 'sul-sudeste', 4440.00, 2500.00),
('Ramagril', 'Santa Helena', 'PR', 'sul-sudeste', 4704.00, 2500.00),
('Taura''s Implementos', 'Toledo', 'PR', 'sul-sudeste', 4368.00, 2500.00),
('Auto Mecanica Mamboré', 'Mamboré', 'PR', 'sul-sudeste', 5216.00, 2500.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- SANTA CATARINA (SC)
-- Região: Sul-Sudeste
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Mecânica Claus', 'Jaraguá do Sul', 'SC', 'sul-sudeste', 6328.00, 2500.00),
('Hidromec', 'Lages', 'SC', 'sul-sudeste', 4360.00, 2500.00),
('Trator Diesel', 'Xanxerê', 'SC', 'sul-sudeste', 2576.00, 1500.00),
('MAK Metais e Hidráulicas', 'Barra Velha', 'SC', 'sul-sudeste', 6552.00, 3500.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- MATO GROSSO DO SUL (MS)
-- Região: Centro-Oeste
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Hidraucruz', 'Campo Grande', 'MS', 'centro-oeste', 9072.00, 5000.00),
('SHD Hidráulicos', 'Dourados', 'MS', 'centro-oeste', 7304.00, 4000.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- MATO GROSSO (MT)
-- Região: Centro-Oeste
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Fort Maq manutenção e reparo de maquinas e equipamentos LTDA', 'Sinop', 'MT', 'centro-oeste', 18240.00, 7000.00),
('HidrauFort Serviços', 'Lucas do Rio Verde', 'MT', 'centro-oeste', 17328.00, 7000.00),
('RGA Montagem e Manutenções de Munck', 'Várzea Grande', 'MT', 'centro-oeste', 14728.00, 6000.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- SÃO PAULO (SP)
-- Região: Sul-Sudeste
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Laizo Optimus', 'Americana', 'SP', 'sul-sudeste', 9136.00, 5000.00),
('Hidrau Máquinas', 'Votuporanga', 'SP', 'sul-sudeste', 10008.00, 5000.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- GOIÁS (GO)
-- Região: Sul-Sudeste (conforme agrupamento definido)
-- ============================================

INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('FL Usinagem e serviços', 'Rio Verde', 'GO', 'sul-sudeste', 12528.00, 5000.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
    regiao_grupo = EXCLUDED.regiao_grupo,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- AGUARDANDO DADOS: MG, Norte, Nordeste
-- ============================================

-- Verificar registros inseridos por estado
SELECT 
    uf, 
    COUNT(*) as total_oficinas,
    regiao_grupo
FROM fretes 
GROUP BY uf, regiao_grupo
ORDER BY uf;

-- Verificar total por região
SELECT 
    regiao_grupo,
    COUNT(*) as total_oficinas
FROM fretes 
GROUP BY regiao_grupo
ORDER BY regiao_grupo;

