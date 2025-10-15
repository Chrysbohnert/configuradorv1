-- ⚠️ IMPORTANTE: Execute este comando no SQL Editor do Supabase
-- Cria a tabela para armazenar a descrição de pronta entrega (Admin)

-- Primeiro, remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON pronta_entrega_descricao;
DROP POLICY IF EXISTS "Permitir escrita para admins" ON pronta_entrega_descricao;
DROP POLICY IF EXISTS "Permitir escrita para usuários autenticados" ON pronta_entrega_descricao;

-- Remover a tabela se já existir (para recriar com tipo correto)
DROP TABLE IF EXISTS pronta_entrega_descricao CASCADE;

-- Criar tabela com UUID
CREATE TABLE pronta_entrega_descricao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar política RLS (Row Level Security)
ALTER TABLE pronta_entrega_descricao ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados"
ON pronta_entrega_descricao
FOR SELECT
TO authenticated
USING (true);

-- Política: Permitir escrita para todos os usuários autenticados
-- (A validação de admin será feita na aplicação)
CREATE POLICY "Permitir escrita para usuários autenticados"
ON pronta_entrega_descricao
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Inserir registro inicial vazio
INSERT INTO pronta_entrega_descricao (descricao)
VALUES ('')
ON CONFLICT DO NOTHING;
