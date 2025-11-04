-- ============================================
-- TABELA: solicitacoes_desconto
-- Sistema de Aprovação de Descontos em Tempo Real
-- ============================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS solicitacoes_desconto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação da proposta/pedido
  pedido_id UUID, -- Referência ao pedido (pode ser NULL se ainda não foi salvo)
  numero_proposta TEXT, -- Número da proposta para rastreamento
  
  -- Dados do vendedor
  vendedor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vendedor_nome TEXT NOT NULL,
  vendedor_email TEXT,
  
  -- Dados da proposta
  equipamento_descricao TEXT, -- Ex: "GSI 3500"
  valor_base NUMERIC(10,2), -- Valor base do equipamento
  desconto_atual NUMERIC(5,2) DEFAULT 7.00, -- Desconto atual (padrão 7%)
  
  -- Solicitação do vendedor
  justificativa TEXT, -- Justificativa opcional do vendedor
  
  -- Resposta do gestor
  desconto_aprovado NUMERIC(5,2), -- Desconto que o GESTOR definiu (8-12%)
  observacao_gestor TEXT, -- Observação opcional do gestor
  
  -- Status e auditoria
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'negado', 'cancelado')),
  aprovador_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  aprovador_nome TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  respondido_at TIMESTAMPTZ -- Quando o gestor respondeu
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_desconto(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_vendedor ON solicitacoes_desconto(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created ON solicitacoes_desconto(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_solicitacoes_desconto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solicitacoes_desconto_updated_at
  BEFORE UPDATE ON solicitacoes_desconto
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitacoes_desconto_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE solicitacoes_desconto ENABLE ROW LEVEL SECURITY;

-- Policy 1: Vendedores podem ver apenas suas próprias solicitações
CREATE POLICY "Vendedores veem suas solicitações"
  ON solicitacoes_desconto
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = solicitacoes_desconto.vendedor_id
      AND users.email = auth.email()
      AND users.tipo = 'vendedor'
    )
  );

-- Policy 2: Vendedores podem criar solicitações
CREATE POLICY "Vendedores criam solicitações"
  ON solicitacoes_desconto
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = solicitacoes_desconto.vendedor_id
      AND users.email = auth.email()
      AND users.tipo = 'vendedor'
    )
  );

-- Policy 3: Vendedores podem cancelar suas próprias solicitações pendentes
CREATE POLICY "Vendedores cancelam suas solicitações"
  ON solicitacoes_desconto
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = solicitacoes_desconto.vendedor_id
      AND users.email = auth.email()
      AND users.tipo = 'vendedor'
    )
    AND status = 'pendente'
  )
  WITH CHECK (
    status = 'cancelado'
  );

-- Policy 4: Admins veem TODAS as solicitações
CREATE POLICY "Admins veem todas solicitações"
  ON solicitacoes_desconto
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.email = auth.email()
      AND users.tipo = 'admin'
    )
  );

-- Policy 5: Admins podem aprovar/negar solicitações
CREATE POLICY "Admins aprovam/negam solicitações"
  ON solicitacoes_desconto
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.email = auth.email()
      AND users.tipo = 'admin'
    )
  )
  WITH CHECK (
    status IN ('aprovado', 'negado')
  );

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE solicitacoes_desconto IS 'Solicitações de desconto acima de 7% que precisam de aprovação do gestor';
COMMENT ON COLUMN solicitacoes_desconto.desconto_atual IS 'Desconto padrão aplicado antes da solicitação (geralmente 7%)';
COMMENT ON COLUMN solicitacoes_desconto.desconto_aprovado IS 'Desconto final aprovado pelo gestor (8-12%)';
COMMENT ON COLUMN solicitacoes_desconto.status IS 'Status: pendente | aprovado | negado | cancelado';

-- ============================================
-- DADOS DE TESTE (OPCIONAL - REMOVER EM PRODUÇÃO)
-- ============================================

-- Descomentar para inserir dados de teste
/*
INSERT INTO solicitacoes_desconto (
  vendedor_id,
  vendedor_nome,
  vendedor_email,
  equipamento_descricao,
  valor_base,
  desconto_atual,
  justificativa,
  status
) VALUES (
  (SELECT id FROM users WHERE tipo = 'vendedor' LIMIT 1),
  'João Silva',
  'joao@example.com',
  'GSI 3500',
  63197.00,
  7.00,
  'Cliente recorrente com histórico de compras mensais',
  'pendente'
);
*/

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se a tabela foi criada
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'solicitacoes_desconto'
ORDER BY ordinal_position;

-- Verificar policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'solicitacoes_desconto';
