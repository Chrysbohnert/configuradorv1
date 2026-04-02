-- Execute este SQL no Supabase Dashboard para debugar o problema
-- Verifique se o usuário admin_concessionária tem concessionaria_id configurado

-- 1. Verificar todos os usuários admin_concessionaria
SELECT 
  id, 
  email, 
  tipo, 
  concessionaria_id,
  created_at
FROM public.users 
WHERE tipo = 'admin_concessionaria';

-- 2. Verificar se há concessionárias cadastradas
SELECT 
  id, 
  nome, 
  uf, 
  regiao_preco,
  created_at
FROM public.concessionarias;

-- 3. Testar política RLS manualmente (substitua 'email@admin.com' pelo email real)
-- Descomente e ajuste o email abaixo para testar
/*
SELECT 
  auth.email() as current_email,
  u.concessionaria_id as user_concessionaria_id
FROM public.users u
WHERE u.email = 'email@admin.com' AND u.tipo = 'admin_concessionaria';
*/
