-- =============================================================================
-- RESTAURAR PERMISSÕES DO USUÁRIO starkindustrial_configuser
-- Execute como superuser (postgres) no banco starkindustrial_configurador
-- =============================================================================

-- 1. Permissão de conexão ao banco
GRANT CONNECT ON DATABASE starkindustrial_configurador TO starkindustrial_configuser;

-- 2. Acesso ao schema public
GRANT USAGE ON SCHEMA public TO starkindustrial_configuser;

-- 3. Permissões em todas as tabelas existentes
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO starkindustrial_configuser;

-- 4. Permissões nas sequences (para colunas SERIAL/BIGSERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO starkindustrial_configuser;

-- 5. Permissões padrão para tabelas/sequences criadas no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO starkindustrial_configuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO starkindustrial_configuser;

-- =============================================================================
-- TABELAS CONFIRMADAS (varredura de todos os services do backend):
--   app_users, fretes, concessionarias, guindastes,
--   precos_guindaste_regiao, precos_compra_concessionaria_por_regiao,
--   propostas, graficos_carga, clientes, solicitacoes_desconto,
--   metas_vendedores, areas_atuacao, precificacao_historico,
--   precificacao_condicoes, tributacao, precificacao,
--   concessionaria_precos, configuracoes_globais
-- =============================================================================
