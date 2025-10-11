-- ============================================
-- SCRIPT COMPLETO PARA CRIAÇÃO DO BANCO DE DADOS
-- Configurador de Guindastes - Sistema de Orçamentos
-- ============================================
-- 
-- Este script cria todas as tabelas necessárias do zero
-- Execute no Supabase SQL Editor ou outro cliente PostgreSQL
-- 
-- Ordem de execução respeitada para evitar erros de foreign key
-- ============================================

-- ============================================
-- 1. TABELA: users
-- Armazena usuários do sistema (admins e vendedores)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefone VARCHAR(20),
  cpf VARCHAR(14),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('admin', 'vendedor')),
  comissao DECIMAL(5,2) DEFAULT 0.00,
  regiao VARCHAR(50),
  senha TEXT NOT NULL, -- Hash SHA-256 da senha
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tipo ON users(tipo);
CREATE INDEX idx_users_regiao ON users(regiao);

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema (administradores e vendedores)';
COMMENT ON COLUMN users.senha IS 'Senha armazenada com hash SHA-256';
COMMENT ON COLUMN users.regiao IS 'Região de atuação: norte, nordeste, sul, sudeste, centro-oeste, rio grande do sul';
COMMENT ON COLUMN users.comissao IS 'Percentual de comissão do vendedor';

-- ============================================
-- 2. TABELA: guindastes
-- Catálogo de guindastes disponíveis
-- ============================================
CREATE TABLE IF NOT EXISTS guindastes (
  id BIGSERIAL PRIMARY KEY,
  subgrupo VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  peso_kg DECIMAL(10,2),
  configuracao TEXT, -- Ex: "CR, EH, ECL, ECS, P, GR"
  tem_contr BOOLEAN DEFAULT false,
  imagem_url TEXT,
  codigo_referencia VARCHAR(50),
  grafico_carga_url TEXT,
  descricao TEXT,
  nao_incluido TEXT,
  imagens_adicionais JSONB, -- Array de URLs de imagens adicionais
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_guindastes_subgrupo ON guindastes(subgrupo);
CREATE INDEX idx_guindastes_modelo ON guindastes(modelo);
CREATE INDEX idx_guindastes_codigo ON guindastes(codigo_referencia);

-- Comentários
COMMENT ON TABLE guindastes IS 'Catálogo de guindastes disponíveis para venda';
COMMENT ON COLUMN guindastes.configuracao IS 'Configurações disponíveis (ex: CR, EH, ECL, ECS, P, GR)';
COMMENT ON COLUMN guindastes.tem_contr IS 'Indica se o guindaste possui controle remoto';
COMMENT ON COLUMN guindastes.descricao IS 'Descrição detalhada do guindaste (o que inclui)';
COMMENT ON COLUMN guindastes.nao_incluido IS 'Lista de itens não incluídos no guindaste';
COMMENT ON COLUMN guindastes.imagens_adicionais IS 'Array JSON com URLs de imagens adicionais';

-- ============================================
-- 3. TABELA: precos_guindaste_regiao
-- Preços dos guindastes por região
-- ============================================
CREATE TABLE IF NOT EXISTS precos_guindaste_regiao (
  id BIGSERIAL PRIMARY KEY,
  guindaste_id BIGINT NOT NULL,
  regiao VARCHAR(50) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_preco_guindaste FOREIGN KEY (guindaste_id) 
    REFERENCES guindastes(id) ON DELETE CASCADE,
  
  -- Constraint única: um guindaste não pode ter dois preços para a mesma região
  CONSTRAINT unique_guindaste_regiao UNIQUE (guindaste_id, regiao)
);

-- Índices
CREATE INDEX idx_precos_guindaste_id ON precos_guindaste_regiao(guindaste_id);
CREATE INDEX idx_precos_regiao ON precos_guindaste_regiao(regiao);

-- Comentários
COMMENT ON TABLE precos_guindaste_regiao IS 'Preços dos guindastes por região do Brasil';
COMMENT ON COLUMN precos_guindaste_regiao.regiao IS 'Regiões: norte-nordeste, centro-oeste, sul-sudeste, rs-com-ie, rs-sem-ie';

-- ============================================
-- 4. TABELA: clientes
-- Dados dos clientes (empresas ou pessoas físicas)
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  documento VARCHAR(20) NOT NULL, -- CPF ou CNPJ
  inscricao_estadual VARCHAR(20),
  endereco TEXT NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  uf CHAR(2) NOT NULL,
  cep VARCHAR(10),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_documento ON clientes(documento);
CREATE INDEX idx_clientes_cidade ON clientes(cidade);
CREATE INDEX idx_clientes_uf ON clientes(uf);

-- Comentários
COMMENT ON TABLE clientes IS 'Cadastro de clientes (empresas ou pessoas físicas)';
COMMENT ON COLUMN clientes.documento IS 'CPF ou CNPJ do cliente';
COMMENT ON COLUMN clientes.inscricao_estadual IS 'Inscrição estadual (opcional)';

-- ============================================
-- 5. TABELA: caminhoes
-- Dados dos caminhões dos clientes
-- ============================================
CREATE TABLE IF NOT EXISTS caminhoes (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- Ex: Truck, Toco, Bitruck
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  ano INTEGER,
  voltagem VARCHAR(10) NOT NULL, -- 12V ou 24V
  placa VARCHAR(10),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_caminhao_cliente FOREIGN KEY (cliente_id) 
    REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Validações
  CONSTRAINT check_ano_valido CHECK (ano IS NULL OR (ano >= 1900 AND ano <= 2100)),
  CONSTRAINT check_voltagem CHECK (voltagem IN ('12V', '24V'))
);

-- Índices
CREATE INDEX idx_caminhoes_cliente_id ON caminhoes(cliente_id);
CREATE INDEX idx_caminhoes_placa ON caminhoes(placa);
CREATE INDEX idx_caminhoes_marca ON caminhoes(marca);

-- Comentários
COMMENT ON TABLE caminhoes IS 'Cadastro de caminhões dos clientes';
COMMENT ON COLUMN caminhoes.tipo IS 'Tipo do caminhão: Truck, Toco, Bitruck, etc';
COMMENT ON COLUMN caminhoes.voltagem IS 'Voltagem do sistema elétrico: 12V ou 24V';

-- ============================================
-- 6. TABELA: pedidos
-- Pedidos/orçamentos gerados pelo sistema
-- ============================================
CREATE TABLE IF NOT EXISTS pedidos (
  id BIGSERIAL PRIMARY KEY,
  numero_pedido VARCHAR(50) NOT NULL UNIQUE,
  cliente_id BIGINT NOT NULL,
  vendedor_id BIGINT NOT NULL,
  caminhao_id BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'em_andamento', 'concluido', 'cancelado')),
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  observacoes TEXT,
  dados_completos JSONB, -- Armazena todos os dados do pedido em formato JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id) 
    REFERENCES clientes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pedido_vendedor FOREIGN KEY (vendedor_id) 
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pedido_caminhao FOREIGN KEY (caminhao_id) 
    REFERENCES caminhoes(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_vendedor_id ON pedidos(vendedor_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at DESC);

-- Comentários
COMMENT ON TABLE pedidos IS 'Pedidos e orçamentos gerados no sistema';
COMMENT ON COLUMN pedidos.numero_pedido IS 'Número único do pedido (gerado automaticamente)';
COMMENT ON COLUMN pedidos.status IS 'Status: pendente, aprovado, em_andamento, concluido, cancelado';
COMMENT ON COLUMN pedidos.dados_completos IS 'JSON com todos os dados do pedido (backup completo)';

-- ============================================
-- 7. TABELA: pedido_itens
-- Itens do pedido (guindastes e opcionais)
-- ============================================
CREATE TABLE IF NOT EXISTS pedido_itens (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('guindaste', 'opcional')),
  item_id BIGINT, -- ID do guindaste ou opcional (se aplicável)
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  codigo_produto VARCHAR(50),
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id) 
    REFERENCES pedidos(id) ON DELETE CASCADE,
  
  -- Validações
  CONSTRAINT check_quantidade_positiva CHECK (quantidade > 0),
  CONSTRAINT check_preco_positivo CHECK (preco_unitario >= 0)
);

-- Índices
CREATE INDEX idx_pedido_itens_pedido_id ON pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_tipo ON pedido_itens(tipo);

-- Comentários
COMMENT ON TABLE pedido_itens IS 'Itens incluídos em cada pedido';
COMMENT ON COLUMN pedido_itens.tipo IS 'Tipo do item: guindaste ou opcional';
COMMENT ON COLUMN pedido_itens.item_id IS 'ID do guindaste (se tipo=guindaste) ou opcional (se tipo=opcional)';

-- ============================================
-- 8. TABELA: graficos_carga
-- Gráficos de carga dos guindastes
-- ============================================
CREATE TABLE IF NOT EXISTS graficos_carga (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  modelo VARCHAR(100),
  capacidade DECIMAL(10,2),
  arquivo_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_graficos_nome ON graficos_carga(nome);
CREATE INDEX idx_graficos_modelo ON graficos_carga(modelo);

-- Comentários
COMMENT ON TABLE graficos_carga IS 'Gráficos de carga técnicos dos guindastes (PDFs)';
COMMENT ON COLUMN graficos_carga.arquivo_url IS 'URL do arquivo PDF no storage';

-- ============================================
-- 9. TABELA: eventos_logistica
-- Calendário de eventos de logística
-- ============================================
CREATE TABLE IF NOT EXISTS eventos_logistica (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_eventos_data ON eventos_logistica(data);

-- Comentários
COMMENT ON TABLE eventos_logistica IS 'Calendário de eventos e anotações de logística';
COMMENT ON COLUMN eventos_logistica.titulo IS 'Título/resumo do evento';

-- ============================================
-- 10. TABELA: pronta_entrega
-- Guindastes disponíveis para pronta entrega
-- ============================================
CREATE TABLE IF NOT EXISTS pronta_entrega (
  id BIGSERIAL PRIMARY KEY,
  guindaste_id BIGINT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  localizacao VARCHAR(255),
  status VARCHAR(20) DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'vendido')),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_pronta_entrega_guindaste FOREIGN KEY (guindaste_id) 
    REFERENCES guindastes(id) ON DELETE CASCADE,
  
  -- Validações
  CONSTRAINT check_quantidade_positiva_pe CHECK (quantidade > 0)
);

-- Índices
CREATE INDEX idx_pronta_entrega_guindaste_id ON pronta_entrega(guindaste_id);
CREATE INDEX idx_pronta_entrega_status ON pronta_entrega(status);

-- Comentários
COMMENT ON TABLE pronta_entrega IS 'Guindastes disponíveis em estoque para entrega imediata';
COMMENT ON COLUMN pronta_entrega.status IS 'Status: disponivel, reservado, vendido';

-- ============================================
-- 11. TABELA: fretes
-- Valores de frete por cidade/oficina
-- ============================================
CREATE TABLE IF NOT EXISTS fretes (
  id BIGSERIAL PRIMARY KEY,
  cidade VARCHAR(100) NOT NULL,
  oficina VARCHAR(200),
  valor_prioridade DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  valor_reaproveitamento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Validações
  CONSTRAINT check_valores_frete CHECK (valor_prioridade > 0 OR valor_reaproveitamento > 0),
  
  -- Constraint única
  CONSTRAINT unique_frete_cidade_oficina UNIQUE (cidade, oficina)
);

-- Índices
CREATE INDEX idx_fretes_cidade ON fretes(cidade);
CREATE INDEX idx_fretes_oficina ON fretes(oficina);

-- Comentários
COMMENT ON TABLE fretes IS 'Valores de frete por cidade e oficina';
COMMENT ON COLUMN fretes.valor_prioridade IS 'Valor quando o caminhão transporta apenas um equipamento (entrega exclusiva)';
COMMENT ON COLUMN fretes.valor_reaproveitamento IS 'Valor quando espera formar carga completa (mais econômico)';

-- ============================================
-- DADOS INICIAIS: Fretes por Oficina
-- ============================================
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
ON CONFLICT (cidade, oficina) DO UPDATE SET
  valor_prioridade = EXCLUDED.valor_prioridade,
  valor_reaproveitamento = EXCLUDED.valor_reaproveitamento,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- Atualiza automaticamente o campo updated_at
-- ============================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guindastes_updated_at BEFORE UPDATE ON guindastes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_precos_updated_at BEFORE UPDATE ON precos_guindaste_regiao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caminhoes_updated_at BEFORE UPDATE ON caminhoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graficos_updated_at BEFORE UPDATE ON graficos_carga
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_updated_at BEFORE UPDATE ON eventos_logistica
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pronta_entrega_updated_at BEFORE UPDATE ON pronta_entrega
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fretes_updated_at BEFORE UPDATE ON fretes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View para ver pedidos com informações completas
CREATE OR REPLACE VIEW vw_pedidos_completos AS
SELECT 
  p.id,
  p.numero_pedido,
  p.status,
  p.valor_total,
  p.created_at,
  p.observacoes,
  c.nome AS cliente_nome,
  c.email AS cliente_email,
  c.telefone AS cliente_telefone,
  c.documento AS cliente_documento,
  c.cidade AS cliente_cidade,
  c.uf AS cliente_uf,
  v.nome AS vendedor_nome,
  v.email AS vendedor_email,
  v.regiao AS vendedor_regiao,
  cam.marca AS caminhao_marca,
  cam.modelo AS caminhao_modelo,
  cam.tipo AS caminhao_tipo,
  cam.placa AS caminhao_placa
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
INNER JOIN users v ON p.vendedor_id = v.id
INNER JOIN caminhoes cam ON p.caminhao_id = cam.id;

COMMENT ON VIEW vw_pedidos_completos IS 'View com informações completas dos pedidos para relatórios';

-- View para ver guindastes com preços por região
CREATE OR REPLACE VIEW vw_guindastes_precos AS
SELECT 
  g.id,
  g.subgrupo,
  g.modelo,
  g.peso_kg,
  g.configuracao,
  g.codigo_referencia,
  p.regiao,
  p.preco,
  g.imagem_url,
  g.grafico_carga_url,
  g.tem_contr
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
ORDER BY g.subgrupo, g.modelo, p.regiao;

COMMENT ON VIEW vw_guindastes_precos IS 'View com guindastes e seus preços por região';

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- Recomendações para Supabase
-- ============================================

-- Habilitar RLS nas tabelas sensíveis
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Exemplo de política: Vendedores só veem seus próprios pedidos
-- CREATE POLICY vendedor_own_pedidos ON pedidos
--   FOR SELECT
--   USING (vendedor_id = auth.uid());

-- Exemplo de política: Admins veem tudo
-- CREATE POLICY admin_all_pedidos ON pedidos
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE users.id = auth.uid() 
--       AND users.tipo = 'admin'
--     )
--   );

-- ============================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================

-- Índice composto para buscas frequentes
CREATE INDEX idx_pedidos_vendedor_status ON pedidos(vendedor_id, status);
CREATE INDEX idx_pedidos_cliente_created ON pedidos(cliente_id, created_at DESC);

-- Índice para busca de texto em guindastes
CREATE INDEX idx_guindastes_busca ON guindastes USING gin(to_tsvector('portuguese', subgrupo || ' ' || modelo));

-- ============================================
-- ESTATÍSTICAS E OTIMIZAÇÕES
-- ============================================

-- Atualizar estatísticas das tabelas
ANALYZE users;
ANALYZE guindastes;
ANALYZE precos_guindaste_regiao;
ANALYZE clientes;
ANALYZE caminhoes;
ANALYZE pedidos;
ANALYZE pedido_itens;
ANALYZE graficos_carga;
ANALYZE eventos_logistica;
ANALYZE pronta_entrega;
ANALYZE fretes;

-- ============================================
-- SCRIPT FINALIZADO COM SUCESSO
-- ============================================

-- Verificar tabelas criadas
SELECT 
  schemaname as schema,
  tablename as tabela,
  tableowner as proprietario
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ BANCO DE DADOS CRIADO COM SUCESSO!';
  RAISE NOTICE '📋 11 tabelas criadas';
  RAISE NOTICE '🔧 Triggers configurados';
  RAISE NOTICE '📊 Views criadas';
  RAISE NOTICE '💾 Dados iniciais inseridos (fretes)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Configure as políticas RLS no Supabase (se aplicável)';
  RAISE NOTICE '2. Crie buckets de storage: guindastes e graficos-carga';
  RAISE NOTICE '3. Crie um usuário admin inicial';
  RAISE NOTICE '4. Importe o catálogo de guindastes';
  RAISE NOTICE '5. Configure os preços por região';
END $$;

