-- ============================================
-- DADOS INICIAIS E EXEMPLOS
-- Configurador de Guindastes - Sistema de Orçamentos
-- ============================================
-- 
-- Este script insere dados iniciais para começar a usar o sistema
-- Execute APÓS criar as tabelas com create_all_tables.sql
-- ============================================

-- ============================================
-- 1. CRIAR USUÁRIO ADMINISTRADOR INICIAL
-- ============================================
-- Senha padrão: admin123 (hash SHA-256)
-- ⚠️ IMPORTANTE: Altere a senha após o primeiro login!

INSERT INTO users (nome, email, telefone, cpf, tipo, comissao, regiao, senha, ativo) VALUES
('Administrador', 'admin@guindastes.com', '(51) 99999-9999', '000.000.000-00', 'admin', 0.00, null, 
'240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', -- senha: admin123
true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. CRIAR VENDEDORES DE EXEMPLO
-- ============================================
-- Senha padrão para todos: vendedor123 (hash SHA-256)

INSERT INTO users (nome, email, telefone, cpf, tipo, comissao, regiao, senha, ativo) VALUES
-- Vendedor do Sul-Sudeste
('João Silva', 'joao.silva@guindastes.com', '(11) 98888-7777', '111.111.111-11', 'vendedor', 5.00, 'sul-sudeste',
'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- senha: vendedor123
true),

-- Vendedor do Norte-Nordeste
('Maria Santos', 'maria.santos@guindastes.com', '(85) 98888-6666', '222.222.222-22', 'vendedor', 5.00, 'norte-nordeste',
'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- senha: vendedor123
true),

-- Vendedor do Centro-Oeste
('Pedro Costa', 'pedro.costa@guindastes.com', '(61) 98888-5555', '333.333.333-33', 'vendedor', 5.00, 'centro-oeste',
'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- senha: vendedor123
true),

-- Vendedor do Rio Grande do Sul (região especial com IE)
('Hugo Ferreira', 'hugo.ferreira@guindastes.com', '(51) 98888-4444', '444.444.444-44', 'vendedor', 5.00, 'rio grande do sul',
'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- senha: vendedor123
true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. CRIAR GUINDASTES DE EXEMPLO
-- ============================================
-- Alguns exemplos para teste do sistema

INSERT INTO guindastes (subgrupo, modelo, peso_kg, configuracao, tem_contr, codigo_referencia, descricao, nao_incluido) VALUES
-- Guindastes Articulados
('Articulado', 'GSI 1500', 450.00, 'CR, EH, ECL, P', true, 'GSI-1500',
'Guindaste articulado com capacidade de 1.5 toneladas. Inclui controle remoto, estabilizadores hidráulicos e lança principal.',
'Instalação, frete, treinamento operacional'),

('Articulado', 'GSI 2500', 580.00, 'CR, EH, ECL, ECS, P, GR', true, 'GSI-2500',
'Guindaste articulado com capacidade de 2.5 toneladas. Inclui controle remoto, estabilizadores, rotação de 360° e garra hidráulica.',
'Instalação, frete, treinamento operacional'),

('Articulado', 'GSI 3500', 720.00, 'CR, EH, ECL, ECS, P, GR', true, 'GSI-3500',
'Guindaste articulado pesado com 3.5 toneladas. Sistema completo com controle remoto avançado.',
'Instalação, frete, treinamento operacional'),

-- Guindastes Telescópicos
('Telescópico', 'GSI T-2000', 620.00, 'CR, EH, P', true, 'GSI-T2000',
'Guindaste telescópico com lança de 4 seções. Ideal para trabalhos em altura.',
'Instalação, frete, treinamento operacional'),

('Telescópico', 'GSI T-3000', 780.00, 'CR, EH, ECL, P', true, 'GSI-T3000',
'Guindaste telescópico de alta performance com 5 seções e controle eletrônico.',
'Instalação, frete, treinamento operacional');

-- ============================================
-- 4. CONFIGURAR PREÇOS POR REGIÃO
-- ============================================
-- Preços de exemplo para os guindastes criados acima
-- Ajuste conforme sua realidade comercial

DO $$
DECLARE
  guindaste_record RECORD;
  regiao_record RECORD;
  preco_base DECIMAL(10,2);
  fator_regional DECIMAL(3,2);
BEGIN
  -- Para cada guindaste
  FOR guindaste_record IN SELECT id, peso_kg FROM guindastes LOOP
    -- Calcular preço base (exemplo: R$ 100 por kg)
    preco_base := guindaste_record.peso_kg * 100;
    
    -- Aplicar fatores regionais
    -- Norte-Nordeste: +15% (logística mais cara)
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    VALUES (guindaste_record.id, 'norte-nordeste', preco_base * 1.15)
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
    
    -- Sul-Sudeste: preço padrão
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    VALUES (guindaste_record.id, 'sul-sudeste', preco_base)
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
    
    -- Centro-Oeste: +8%
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    VALUES (guindaste_record.id, 'centro-oeste', preco_base * 1.08)
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
    
    -- Rio Grande do Sul COM IE: -5% (incentivo fiscal)
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    VALUES (guindaste_record.id, 'rs-com-ie', preco_base * 0.95)
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
    
    -- Rio Grande do Sul SEM IE: preço padrão
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    VALUES (guindaste_record.id, 'rs-sem-ie', preco_base)
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 5. CRIAR CLIENTE DE EXEMPLO
-- ============================================

INSERT INTO clientes (nome, telefone, email, documento, inscricao_estadual, endereco, cidade, uf, cep) VALUES
('Transportadora Exemplo Ltda', '(51) 3333-4444', 'contato@transportadoraexemplo.com.br', 
'12.345.678/0001-90', '123.456.789', 
'Rua das Empresas, 1000', 'Porto Alegre', 'RS', '90000-000')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. CRIAR CAMINHÃO DE EXEMPLO
-- ============================================

INSERT INTO caminhoes (cliente_id, tipo, marca, modelo, ano, voltagem, placa, observacoes)
SELECT 
  c.id,
  'Truck',
  'Mercedes-Benz',
  'Atego 1719',
  2022,
  '24V',
  'ABC1234',
  'Caminhão em excelente estado de conservação'
FROM clientes c
WHERE c.documento = '12.345.678/0001-90'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. CRIAR EVENTOS DE LOGÍSTICA DE EXEMPLO
-- ============================================

INSERT INTO eventos_logistica (data, titulo, descricao) VALUES
(CURRENT_DATE + INTERVAL '7 days', 'Entrega de Guindaste - Cliente XYZ', 'Agendar caminhão para entrega em Porto Alegre'),
(CURRENT_DATE + INTERVAL '14 days', 'Visita Técnica - Oficina ABC', 'Reunião com equipe de instalação'),
(CURRENT_DATE + INTERVAL '21 days', 'Treinamento Operadores', 'Capacitação de 5 operadores no cliente')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. ADICIONAR GUINDASTES DE PRONTA ENTREGA
-- ============================================

INSERT INTO pronta_entrega (guindaste_id, quantidade, localizacao, status, observacoes)
SELECT 
  g.id,
  2,
  'Depósito Porto Alegre - Setor A',
  'disponivel',
  'Equipamentos revisados e prontos para venda'
FROM guindastes g
WHERE g.modelo = 'GSI 1500'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO pronta_entrega (guindaste_id, quantidade, localizacao, status, observacoes)
SELECT 
  g.id,
  1,
  'Depósito São Paulo - Setor B',
  'disponivel',
  'Equipamento novo na caixa'
FROM guindastes g
WHERE g.modelo = 'GSI 2500'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICAÇÕES E RELATÓRIOS
-- ============================================

-- Contar registros inseridos
DO $$
DECLARE
  cnt_users INTEGER;
  cnt_guindastes INTEGER;
  cnt_precos INTEGER;
  cnt_clientes INTEGER;
  cnt_caminhoes INTEGER;
  cnt_fretes INTEGER;
  cnt_eventos INTEGER;
  cnt_pronta INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt_users FROM users;
  SELECT COUNT(*) INTO cnt_guindastes FROM guindastes;
  SELECT COUNT(*) INTO cnt_precos FROM precos_guindaste_regiao;
  SELECT COUNT(*) INTO cnt_clientes FROM clientes;
  SELECT COUNT(*) INTO cnt_caminhoes FROM caminhoes;
  SELECT COUNT(*) INTO cnt_fretes FROM fretes;
  SELECT COUNT(*) INTO cnt_eventos FROM eventos_logistica;
  SELECT COUNT(*) INTO cnt_pronta FROM pronta_entrega;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DADOS INICIAIS INSERIDOS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMO:';
  RAISE NOTICE '  👥 Usuários: %', cnt_users;
  RAISE NOTICE '  🏗️  Guindastes: %', cnt_guindastes;
  RAISE NOTICE '  💰 Preços por região: %', cnt_precos;
  RAISE NOTICE '  👤 Clientes: %', cnt_clientes;
  RAISE NOTICE '  🚛 Caminhões: %', cnt_caminhoes;
  RAISE NOTICE '  📦 Fretes configurados: %', cnt_fretes;
  RAISE NOTICE '  📅 Eventos de logística: %', cnt_eventos;
  RAISE NOTICE '  ⚡ Pronta entrega: %', cnt_pronta;
  RAISE NOTICE '';
  RAISE NOTICE '🔑 CREDENCIAIS DE ACESSO:';
  RAISE NOTICE '  Admin: admin@guindastes.com / admin123';
  RAISE NOTICE '  Vendedor: joao.silva@guindastes.com / vendedor123';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Altere as senhas padrão após o primeiro login!';
  RAISE NOTICE '';
END $$;

-- ============================================
-- QUERIES ÚTEIS PARA VERIFICAÇÃO
-- ============================================

-- Listar todos os usuários
-- SELECT id, nome, email, tipo, regiao, ativo FROM users ORDER BY tipo, nome;

-- Listar guindastes com preços
-- SELECT g.modelo, p.regiao, p.preco 
-- FROM guindastes g 
-- INNER JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id 
-- ORDER BY g.modelo, p.regiao;

-- Listar fretes por cidade
-- SELECT cidade, oficina, valor_prioridade, valor_reaproveitamento 
-- FROM fretes 
-- ORDER BY cidade;

-- Verificar pronta entrega disponível
-- SELECT g.modelo, pe.quantidade, pe.localizacao 
-- FROM pronta_entrega pe 
-- INNER JOIN guindastes g ON pe.guindaste_id = g.id 
-- WHERE pe.status = 'disponivel';

