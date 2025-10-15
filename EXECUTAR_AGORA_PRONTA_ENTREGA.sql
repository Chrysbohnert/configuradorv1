-- ⚠️ EXECUTAR ESTE SQL NO SUPABASE - SOLUÇÃO DEFINITIVA

-- 1. DESABILITAR RLS temporariamente para limpar tudo
ALTER TABLE IF EXISTS pronta_entrega_descricao DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS as políticas (qualquer nome)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pronta_entrega_descricao') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON pronta_entrega_descricao';
    END LOOP;
END $$;

-- 3. DROPAR a tabela completamente
DROP TABLE IF EXISTS pronta_entrega_descricao CASCADE;

-- 4. CRIAR tabela nova com UUID
CREATE TABLE pronta_entrega_descricao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HABILITAR RLS
ALTER TABLE pronta_entrega_descricao ENABLE ROW LEVEL SECURITY;

-- 6. CRIAR políticas SIMPLES (sem conversão de tipos)
CREATE POLICY "allow_read_all"
ON pronta_entrega_descricao
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_insert_all"
ON pronta_entrega_descricao
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_update_all"
ON pronta_entrega_descricao
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_delete_all"
ON pronta_entrega_descricao
FOR DELETE
TO authenticated
USING (true);

-- 7. INSERIR registro inicial
INSERT INTO pronta_entrega_descricao (descricao)
VALUES ('');

-- 8. VERIFICAR se funcionou
SELECT * FROM pronta_entrega_descricao;
