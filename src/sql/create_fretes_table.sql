-- Criação da tabela de fretes
-- Esta tabela armazena os valores de frete por cidade/oficina
-- com duas opções: prioridade (entrega exclusiva) e reaproveitamento (carga compartilhada)

CREATE TABLE IF NOT EXISTS fretes (
  id SERIAL PRIMARY KEY,
  cidade VARCHAR(100) NOT NULL,
  oficina VARCHAR(200),
  valor_prioridade DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_reaproveitamento DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Garantir que pelo menos um valor seja maior que zero
  CONSTRAINT check_valores CHECK (valor_prioridade > 0 OR valor_reaproveitamento > 0),

  -- Índice para busca rápida por cidade
  INDEX idx_fretes_cidade (cidade),

  -- Índice único por cidade/oficina (se oficina for especificada)
  UNIQUE KEY unique_frete_cidade_oficina (cidade, oficina)
);

-- Inserir dados iniciais baseados nas oficinas existentes
INSERT INTO fretes (cidade, oficina, valor_prioridade, valor_reaproveitamento) VALUES
('Santa Rosa', 'Agiltec', 5824.00, 3000.00),
('Pelotas', 'Rodokurtz', 500.00, 500.00),
('São José do Inhacorá', 'Hidroen Guindastes', 2160.00, 1500.00),
('Santa Maria', 'Trevisan', 3000.00, 1500.00),
('Canoas', 'Berto', 4000.00, 2000.00),
('Alvorada', 'Guindas Move', 3080.00, 1800.00),
('Nova Prata', 'Salex', 4464.00, 2200.00),
('Santo Antônio da Patrulha', 'Guindasmap', 2784.00, 1800.00),
('Caxias do Sul', 'VRC Manutenções', 1952.00, 1500.00),
('Erechim', 'BGS Implementos', 1800.00, 1500.00),
('Não-Me-Toque', 'R.D.P. Soluções Hidráulicas', 2744.00, 1800.00),
('Carazinho', 'KM Prestação de Serviço Mecânico', 1800.00, 1500.00),
('Alegrete', 'Mecânica Acosta', 1800.00, 1500.00),
('Santo Ângelo', 'KIST Oficina de Furgões', 500.00, 500.00),
('Cândido Godói', 'Henz & Cassola Comércio', 500.00, 500.00)
ON DUPLICATE KEY UPDATE
  valor_prioridade = VALUES(valor_prioridade),
  valor_reaproveitamento = VALUES(valor_reaproveitamento),
  updated_at = CURRENT_TIMESTAMP;

-- Comentários sobre a tabela
-- valor_prioridade: Valor cobrado quando o caminhão leva apenas aquele equipamento
-- valor_reaproveitamento: Valor cobrado quando espera formar carga completa (mais econômico)
-- Esta estrutura permite flexibilidade para diferentes estratégias de entrega

