-- ✅ VERIFICAR SE O CAMPO estoque_descontado EXISTE

-- 1. Verificar estrutura da tabela pedidos
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
ORDER BY ordinal_position;

-- 2. Verificar se o campo estoque_descontado existe especificamente
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
AND column_name = 'estoque_descontado';

-- 3. Ver últimos pedidos e verificar os campos
SELECT 
  id, 
  numero_pedido, 
  id_guindaste,
  estoque_descontado,
  created_at
FROM pedidos 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Ver estoque atual dos guindastes
SELECT 
  id, 
  subgrupo, 
  modelo,
  quantidade_disponivel
FROM guindastes 
ORDER BY id
LIMIT 10;
