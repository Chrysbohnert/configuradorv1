-- Verificar o usuário atual autenticado
SELECT auth.uid() as current_auth_uid;

-- Verificar se o usuário existe na tabela users
SELECT id, email, tipo, created_at 
FROM users 
WHERE id = (auth.uid())::text::bigint;

-- Verificar todos os usuários admin
SELECT id, email, tipo 
FROM users 
WHERE tipo = 'admin';

-- Verificar se há problema de conversão de tipo
SELECT 
    auth.uid() as auth_uid,
    (auth.uid())::text as auth_uid_text,
    ((auth.uid())::text)::bigint as auth_uid_bigint;

-- Verificar estrutura da tabela users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'tipo');
