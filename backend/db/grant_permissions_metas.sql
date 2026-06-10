-- Conceder permissões na tabela metas_vendedores
-- Substitua 'seu_usuario' pelo usuário que sua aplicação usa para conectar ao banco

-- Se você não sabe qual usuário, execute: SELECT current_user;

-- Opção 1: Conceder todas as permissões para um usuário específico
-- GRANT ALL PRIVILEGES ON TABLE metas_vendedores TO seu_usuario;
-- GRANT USAGE, SELECT ON SEQUENCE metas_vendedores_id_seq TO seu_usuario;

-- Opção 2: Conceder para o usuário atual (recomendado)
GRANT ALL PRIVILEGES ON TABLE metas_vendedores TO CURRENT_USER;
GRANT USAGE, SELECT ON SEQUENCE metas_vendedores_id_seq TO CURRENT_USER;

-- Opção 3: Se estiver usando um usuário específico (exemplo: postgres, app_user, etc)
-- Descomente e ajuste conforme necessário:
-- GRANT ALL PRIVILEGES ON TABLE metas_vendedores TO postgres;
-- GRANT USAGE, SELECT ON SEQUENCE metas_vendedores_id_seq TO postgres;

-- Verificar permissões concedidas
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'metas_vendedores';
