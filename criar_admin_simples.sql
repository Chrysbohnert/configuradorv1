-- Criar usuário admin de forma simples e direta
-- Sem depender de triggers ou metadados

-- 1. Inserir na tabela public.users (senha: admin123)
INSERT INTO public.users (
    nome,
    email,
    telefone,
    cpf,
    tipo,
    comissao,
    senha,
    created_at,
    updated_at,
    regiao,
    foto_perfil,
    auth_user_id
) VALUES (
    'Rodrigo Admin',
    'rodrigo@starkorcamento.com',
    NULL,
    NULL,
    'admin',
    '5.00',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',  -- SHA256 de "admin123"
    NOW(),
    NOW(),
    NULL,
    NULL,
    NULL
);

-- 2. Verificar se foi criado
SELECT * FROM public.users WHERE email = 'rodrigo@starkorcamento.com';
