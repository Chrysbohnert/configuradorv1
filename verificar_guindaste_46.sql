-- Verificar se o guindaste com ID 46 existe
SELECT id, modelo, subgrupo FROM guindastes WHERE id = 46;

-- Verificar quantos registros existem na tabela
SELECT COUNT(*) as total_registros FROM guindastes;

-- Verificar os últimos 10 registros
SELECT id, modelo, subgrupo FROM guindastes ORDER BY id DESC LIMIT 10;

-- Verificar políticas RLS da tabela guindastes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'guindastes';

-- Verificar se a tabela tem RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'guindastes';
