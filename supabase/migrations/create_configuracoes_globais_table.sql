-- Tabela para armazenar configurações globais (ex: cotação USD)
CREATE TABLE IF NOT EXISTS configuracoes_globais (
  chave TEXT PRIMARY KEY,
  valor_numero DECIMAL(18, 6),
  valor_texto TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_configuracoes_globais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_configuracoes_globais_updated_at ON configuracoes_globais;
CREATE TRIGGER trigger_configuracoes_globais_updated_at
  BEFORE UPDATE ON configuracoes_globais
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracoes_globais_updated_at();

-- Valor padrão sugerido (pode ser alterado no Admin)
INSERT INTO configuracoes_globais (chave, valor_numero)
VALUES ('usd_brl', 5.12)
ON CONFLICT (chave) DO NOTHING;
