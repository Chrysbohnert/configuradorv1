-- Tabela para armazenar histórico de propostas e orçamentos
CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_proposta VARCHAR(20) NOT NULL UNIQUE,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vendedor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vendedor_nome VARCHAR(255) NOT NULL,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_documento VARCHAR(50),
  valor_total DECIMAL(12, 2) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('orcamento', 'proposta')),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'finalizado', 'excluido')),
  dados_serializados JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_propostas_vendedor ON propostas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_tipo ON propostas(tipo);
CREATE INDEX IF NOT EXISTS idx_propostas_data ON propostas(data DESC);
CREATE INDEX IF NOT EXISTS idx_propostas_numero ON propostas(numero_proposta);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_propostas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_propostas_updated_at
  BEFORE UPDATE ON propostas
  FOR EACH ROW
  EXECUTE FUNCTION update_propostas_updated_at();

-- Comentários
COMMENT ON TABLE propostas IS 'Histórico de orçamentos e propostas comerciais';
COMMENT ON COLUMN propostas.tipo IS 'orcamento = preliminar sem dados técnicos | proposta = final completa';
COMMENT ON COLUMN propostas.status IS 'pendente = aguardando finalização | finalizado = completo | excluido = removido';
COMMENT ON COLUMN propostas.dados_serializados IS 'JSON com todos os dados do pedido para recuperação';
