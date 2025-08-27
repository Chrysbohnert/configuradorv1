-- =====================================================
-- CRIAÇÃO DA TABELA GRÁFICOS DE CARGA (SIMPLES)
-- =====================================================

-- Criar tabela para gráficos de carga
CREATE TABLE IF NOT EXISTS graficos_carga (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    capacidade DECIMAL(5,2) NOT NULL,
    tipo VARCHAR(100),
    lanca VARCHAR(100),
    arquivo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca por modelo e capacidade
CREATE INDEX IF NOT EXISTS idx_graficos_carga_modelo ON graficos_carga(modelo);
CREATE INDEX IF NOT EXISTS idx_graficos_carga_capacidade ON graficos_carga(capacidade);

-- Política RLS (Row Level Security) - Permitir acesso a todos os usuários autenticados
ALTER TABLE graficos_carga ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura de gráficos para usuários autenticados" ON graficos_carga
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de gráficos para usuários autenticados" ON graficos_carga
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de gráficos para usuários autenticados" ON graficos_carga
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de gráficos para usuários autenticados" ON graficos_carga
    FOR DELETE USING (auth.role() = 'authenticated');

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_graficos_carga_updated_at 
    BEFORE UPDATE ON graficos_carga 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO graficos_carga (nome, modelo, capacidade, tipo, lanca, arquivo_url) VALUES
('GSI 6.5 - Gráfico de Carga', 'GSI 6.5', 6.5, 'Padrão', '12m', 'https://exemplo.com/grafico-gsi-6.5.pdf'),
('GSE 8.0 - Gráfico de Carga', 'GSE 8.0', 8.0, 'Especial', '15m', 'https://exemplo.com/grafico-gse-8.0.pdf'),
('GSI 10.8 - Gráfico de Carga', 'GSI 10.8', 10.8, 'Industrial', '18m', 'https://exemplo.com/grafico-gsi-10.8.pdf')
ON CONFLICT DO NOTHING;
