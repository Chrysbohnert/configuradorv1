-- Verificar estrutura da tabela guindastes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'guindastes' 
ORDER BY ordinal_position;

-- Verificar se os campos específicos existem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guindastes' 
AND column_name IN ('descricao', 'finame', 'nao_incluido', 'ncm', 'imagens_adicionais');

-- Verificar dados atuais do ID 46
SELECT id, descricao, finame, nao_incluido, ncm, imagens_adicionais
FROM guindastes 
WHERE id = 46;
