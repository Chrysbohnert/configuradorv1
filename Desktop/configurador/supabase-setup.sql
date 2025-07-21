-- =====================================================
-- CONFIGURAÇÃO DO BANCO DE DADOS - STARK ORÇAMENTO
-- =====================================================

-- 1. TABELA DE USUÁRIOS (VENDEDORES E ADMINS)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  cpf VARCHAR(14),
  tipo VARCHAR(20) DEFAULT 'vendedor' CHECK (tipo IN ('admin', 'vendedor')),
  comissao DECIMAL(5,2) DEFAULT 5.00,
  senha VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE GUINDASTES
CREATE TABLE guindastes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('hidraulico', 'telescopico', 'torre')),
  capacidade VARCHAR(50) NOT NULL,
  alcance VARCHAR(50) NOT NULL,
  altura VARCHAR(50),
  preco DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  imagem_url VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE OPCIONAIS
CREATE TABLE opcionais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(50) DEFAULT 'acessorio' CHECK (categoria IN ('acessorio', 'iluminacao', 'controle', 'seguranca')),
  imagem_url VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE CLIENTES
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefone VARCHAR(20),
  documento VARCHAR(20),
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE CAMINHÕES
CREATE TABLE caminhoes (
  id SERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  modelo VARCHAR(100),
  ano VARCHAR(4),
  cor VARCHAR(50),
  cliente_id INTEGER REFERENCES clientes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE PEDIDOS
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido VARCHAR(20) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  vendedor_id INTEGER REFERENCES users(id),
  caminhao_id INTEGER REFERENCES caminhoes(id),
  status VARCHAR(20) DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
  valor_total DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE ITENS DO PEDIDO
CREATE TABLE pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('guindaste', 'opcional')),
  item_id INTEGER NOT NULL, -- ID do guindaste ou opcional
  quantidade INTEGER DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tipo ON users(tipo);
CREATE INDEX idx_guindastes_tipo ON guindastes(tipo);
CREATE INDEX idx_guindastes_ativo ON guindastes(ativo);
CREATE INDEX idx_opcionais_categoria ON opcionais(categoria);
CREATE INDEX idx_opcionais_ativo ON opcionais(ativo);
CREATE INDEX idx_pedidos_vendedor ON pedidos(vendedor_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX idx_pedido_itens_pedido ON pedido_itens(pedido_id);

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS PARA ATUALIZAR TIMESTAMP
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guindastes_updated_at BEFORE UPDATE ON guindastes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opcionais_updated_at BEFORE UPDATE ON opcionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caminhoes_updated_at BEFORE UPDATE ON caminhoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS (APENAS ADMIN PADRÃO)
-- =====================================================

-- Inserir admin padrão (você pode alterar os dados depois)
INSERT INTO users (nome, email, telefone, cpf, tipo, comissao) VALUES 
('Admin', 'admin@starkorcamento.com', '(55) 98172-1286', '000.000.000-00', 'admin', 0.00); 