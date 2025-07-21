-- =====================================================
-- CONFIGURAÇÃO INICIAL - USUÁRIO ADMIN
-- =====================================================

-- Adicionar usuário administrador inicial
-- Execute este script no Supabase SQL Editor

INSERT INTO users (nome, email, telefone, cpf, tipo, comissao, senha) VALUES 
('Chrystian', 'chrystian@starkorcamento.com', '(55) 98172-1286', '000.000.000-00', 'admin', 0.00, 'admin123');

-- =====================================================
-- INSTRUÇÕES
-- =====================================================

/*
COMO USAR:

1. Vá para o Supabase → SQL Editor
2. Cole este script
3. Clique em "Run"
4. Pronto! Agora você pode fazer login com:
   - Email: chrystian@starkorcamento.com
   - Senha: admin123

DEPOIS DISSO:
- Acesse o sistema pelo site
- Vá em "Gerenciar Vendedores" para adicionar vendedores
- Vá em "Gerenciar Guindastes" para adicionar guindastes e opcionais
- Todos os dados ficarão salvos no banco de dados

ALTERNATIVA:
- Se preferir, você pode alterar o email e senha acima
- Ou adicionar mais usuários admin se necessário
*/ 