-- Verificar todas as políticas RLS da tabela guindastes
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'guindastes'
ORDER BY policyname;

-- Verificar se o usuário atual tem permissão
SELECT current_user, session_user;

-- Verificar se existe algum registro com ID 46
SELECT id, modelo, subgrupo, created_at 
FROM guindastes 
WHERE id = 46;

-- Verificar os últimos registros para ver a sequência de IDs
SELECT id, modelo, subgrupo 
FROM guindastes 
ORDER BY id DESC 
LIMIT 10;

-- Verificar se há políticas que bloqueiam UPDATE
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'guindastes' 
AND cmd = 'UPDATE';
