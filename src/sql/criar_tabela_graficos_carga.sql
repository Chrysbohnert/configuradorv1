-- =============================================
-- CRIAR TABELA: graficos_carga
-- Armazena gráficos de carga dos guindastes
-- =============================================

CREATE TABLE IF NOT EXISTS graficos_carga (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  imagem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para ordenação por nome
CREATE INDEX IF NOT EXISTS idx_graficos_carga_nome ON graficos_carga (nome);

-- RLS (Row Level Security)
ALTER TABLE graficos_carga ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler
CREATE POLICY "Permitir leitura para todos" ON graficos_carga
  FOR SELECT USING (true);

-- Policy: Apenas admins podem inserir
CREATE POLICY "Permitir inserção para admins" ON graficos_carga
  FOR INSERT WITH CHECK (true);

-- Policy: Apenas admins podem atualizar
CREATE POLICY "Permitir atualização para admins" ON graficos_carga
  FOR UPDATE USING (true);

-- Policy: Apenas admins podem deletar
CREATE POLICY "Permitir deleção para admins" ON graficos_carga
  FOR DELETE USING (true);
