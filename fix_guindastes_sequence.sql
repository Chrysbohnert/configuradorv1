-- Script para corrigir a sequência de IDs da tabela guindastes
-- Execute este script no SQL Editor do Supabase

-- 1. Criar função para resetar a sequência
CREATE OR REPLACE FUNCTION reset_guindastes_sequence(new_value INTEGER)
RETURNS void AS $$
BEGIN
  PERFORM setval('guindastes_id_seq', new_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Verificar o max ID na tabela ANTES de resetar
SELECT MAX(id) as max_id_atual FROM guindastes;

-- 3. Resetar a sequência para o próximo ID disponível
SELECT setval('guindastes_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM guindastes), false) as nova_sequencia;

-- 4. Verificar se funcionou (usando last_value da sequência)
SELECT last_value FROM guindastes_id_seq;
