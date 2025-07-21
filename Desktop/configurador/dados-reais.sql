-- =====================================================
-- DADOS REAIS - STARK ORÇAMENTO
-- =====================================================

-- 1. USUÁRIOS REAIS
-- (Execute apenas se quiser adicionar usuários específicos)

INSERT INTO users (nome, email, telefone, cpf, tipo, comissao) VALUES 
('Chrystian', 'chrystian@starkorcamento.com', '(55) 98172-1286', '000.000.000-00', 'admin', 0.00),
('João Silva', 'joao@starkorcamento.com', '(55) 99999-9999', '111.111.111-11', 'vendedor', 5.00),
('Maria Santos', 'maria@starkorcamento.com', '(55) 88888-8888', '222.222.222-22', 'vendedor', 5.00),
('Pedro Costa', 'pedro@starkorcamento.com', '(55) 77777-7777', '333.333.333-33', 'vendedor', 5.00);

-- 2. GUINDASTES REAIS
-- (Exemplos de guindastes reais - ajuste conforme sua necessidade)

INSERT INTO guindastes (nome, modelo, tipo, capacidade, alcance, altura, preco, descricao, ativo) VALUES 
('Guindaste Hidráulico 3T', 'GH-3000', 'hidraulico', '3 toneladas', '6 metros', '8 metros', 45000.00, 'Guindaste hidráulico compacto para trabalhos leves e médios', true),
('Guindaste Hidráulico 5T', 'GH-5000', 'hidraulico', '5 toneladas', '8 metros', '10 metros', 65000.00, 'Guindaste hidráulico versátil para média capacidade', true),
('Guindaste Hidráulico 8T', 'GH-8000', 'hidraulico', '8 toneladas', '10 metros', '12 metros', 85000.00, 'Guindaste hidráulico robusto para trabalhos pesados', true),
('Guindaste Telescópico 12T', 'GT-12000', 'telescopico', '12 toneladas', '15 metros', '18 metros', 120000.00, 'Guindaste telescópico de alta capacidade', true),
('Guindaste Telescópico 15T', 'GT-15000', 'telescopico', '15 toneladas', '18 metros', '20 metros', 150000.00, 'Guindaste telescópico profissional', true),
('Guindaste de Torre 20T', 'GT-20000', 'torre', '20 toneladas', '25 metros', '30 metros', 200000.00, 'Guindaste de torre para grandes construções', true);

-- 3. OPCIONAIS REAIS
-- (Exemplos de opcionais reais - ajuste conforme sua necessidade)

INSERT INTO opcionais (nome, preco, descricao, categoria, ativo) VALUES 
('Cabine com Ar Condicionado', 8000.00, 'Cabine climatizada para maior conforto do operador', 'conforto', true),
('Sistema de Estabilização', 12000.00, 'Sistema automático de estabilização para maior segurança', 'seguranca', true),
('Cabo de Aço Inox', 3500.00, 'Cabo de aço inoxidável para maior durabilidade', 'acessorio', true),
('Painel Digital', 6000.00, 'Painel de controle digital com interface moderna', 'controle', true),
('Lanterna LED', 2500.00, 'Sistema de iluminação LED para trabalho noturno', 'iluminacao', true),
('Kit de Ferramentas', 1500.00, 'Kit completo de ferramentas para manutenção', 'acessorio', true),
('Sistema Anti-Colisão', 9000.00, 'Sistema de segurança para evitar colisões', 'seguranca', true),
('Cobertura Estendida', 5000.00, 'Garantia estendida por 2 anos adicionais', 'acessorio', true);

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
COMO USAR ESTE SCRIPT:

1. No Supabase, vá em SQL Editor
2. Clique em "New Query"
3. Cole este script
4. Clique em "Run"

OU

1. Execute apenas as seções que você quiser
2. Comente as linhas que não quiser executar
3. Ajuste os dados conforme sua necessidade

DADOS INCLUÍDOS:
- 4 usuários (1 admin + 3 vendedores)
- 6 guindastes (hidráulicos, telescópicos e torre)
- 8 opcionais (diversas categorias)

PERSONALIZAÇÃO:
- Altere nomes, emails, telefones
- Ajuste preços dos guindastes
- Modifique capacidades e alcances
- Adicione mais opcionais
- Remova dados que não quiser
*/ 