-- ============================================
-- QUERIES ÚTEIS PARA MANUTENÇÃO E ADMINISTRAÇÃO
-- Configurador de Guindastes - Sistema de Orçamentos
-- ============================================

-- ============================================
-- 1. GERENCIAMENTO DE USUÁRIOS
-- ============================================

-- Listar todos os usuários
SELECT 
  id,
  nome,
  email,
  tipo,
  regiao,
  comissao,
  ativo,
  created_at
FROM users 
ORDER BY tipo, nome;

-- Criar novo usuário (vendedor)
-- Substituir os valores conforme necessário
-- Senha será hashada automaticamente pelo sistema
/*
INSERT INTO users (nome, email, telefone, cpf, tipo, comissao, regiao, senha, ativo) VALUES
('Nome do Vendedor', 'email@exemplo.com', '(00) 00000-0000', '000.000.000-00', 
'vendedor', 5.00, 'sul-sudeste', 
'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- senha: vendedor123
true);
*/

-- Alterar senha de um usuário
-- Hash SHA-256 de senhas comuns:
-- admin123: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- vendedor123: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
/*
UPDATE users 
SET senha = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE email = 'usuario@exemplo.com';
*/

-- Desativar um usuário (não excluir)
/*
UPDATE users SET ativo = false WHERE email = 'usuario@exemplo.com';
*/

-- Reativar um usuário
/*
UPDATE users SET ativo = true WHERE email = 'usuario@exemplo.com';
*/

-- Alterar região de um vendedor
/*
UPDATE users 
SET regiao = 'rio grande do sul' 
WHERE email = 'vendedor@exemplo.com';
*/

-- ============================================
-- 2. GERENCIAMENTO DE GUINDASTES
-- ============================================

-- Listar todos os guindastes com contagem de preços configurados
SELECT 
  g.id,
  g.subgrupo,
  g.modelo,
  g.peso_kg,
  g.codigo_referencia,
  g.tem_contr,
  COUNT(p.id) AS regioes_com_preco
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
GROUP BY g.id
ORDER BY g.subgrupo, g.modelo;

-- Verificar guindastes sem preço em alguma região
SELECT 
  g.id,
  g.modelo,
  r.regiao
FROM guindastes g
CROSS JOIN (
  SELECT DISTINCT regiao FROM (
    VALUES ('norte-nordeste'), ('sul-sudeste'), ('centro-oeste'), ('rs-com-ie'), ('rs-sem-ie')
  ) AS t(regiao)
) r
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id AND r.regiao = p.regiao
WHERE p.id IS NULL
ORDER BY g.modelo, r.regiao;

-- Duplicar preços de um guindaste para outro
-- Útil quando um modelo novo tem preços similares a um existente
/*
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
SELECT 
  999 AS guindaste_id, -- ID do novo guindaste
  regiao,
  preco
FROM precos_guindaste_regiao
WHERE guindaste_id = 1; -- ID do guindaste de referência
*/

-- Atualizar preço de um guindaste em todas as regiões (aumentar 10%)
/*
UPDATE precos_guindaste_regiao
SET preco = preco * 1.10
WHERE guindaste_id = 1;
*/

-- Atualizar preço de um guindaste em uma região específica
/*
UPDATE precos_guindaste_regiao
SET preco = 50000.00
WHERE guindaste_id = 1 AND regiao = 'sul-sudeste';
*/

-- ============================================
-- 3. RELATÓRIOS DE VENDAS
-- ============================================

-- Vendas por vendedor (mensal)
SELECT 
  v.nome AS vendedor,
  v.regiao,
  COUNT(p.id) AS total_pedidos,
  SUM(p.valor_total) AS valor_total,
  AVG(p.valor_total) AS ticket_medio,
  DATE_TRUNC('month', p.created_at) AS mes
FROM pedidos p
INNER JOIN users v ON p.vendedor_id = v.id
WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY v.id, v.nome, v.regiao, DATE_TRUNC('month', p.created_at)
ORDER BY mes DESC, valor_total DESC;

-- Ranking de vendedores (últimos 12 meses)
SELECT 
  v.nome AS vendedor,
  v.regiao,
  COUNT(p.id) AS pedidos,
  SUM(p.valor_total) AS faturamento,
  ROUND(AVG(p.valor_total), 2) AS ticket_medio
FROM pedidos p
INNER JOIN users v ON p.vendedor_id = v.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY v.id, v.nome, v.regiao
ORDER BY faturamento DESC;

-- Guindastes mais vendidos
SELECT 
  g.modelo,
  g.subgrupo,
  COUNT(pi.id) AS quantidade_vendida,
  SUM(pi.preco_unitario * pi.quantidade) AS receita_total
FROM pedido_itens pi
INNER JOIN guindastes g ON pi.item_id = g.id
WHERE pi.tipo = 'guindaste'
GROUP BY g.id, g.modelo, g.subgrupo
ORDER BY quantidade_vendida DESC
LIMIT 10;

-- Vendas por região (últimos 6 meses)
SELECT 
  v.regiao,
  COUNT(p.id) AS pedidos,
  SUM(p.valor_total) AS faturamento
FROM pedidos p
INNER JOIN users v ON p.vendedor_id = v.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY v.regiao
ORDER BY faturamento DESC;

-- Pedidos por status
SELECT 
  status,
  COUNT(*) AS quantidade,
  SUM(valor_total) AS valor_total
FROM pedidos
GROUP BY status
ORDER BY quantidade DESC;

-- ============================================
-- 4. RELATÓRIOS DE CLIENTES
-- ============================================

-- Clientes com mais pedidos
SELECT 
  c.nome,
  c.cidade,
  c.uf,
  COUNT(p.id) AS total_pedidos,
  SUM(p.valor_total) AS valor_total
FROM clientes c
INNER JOIN pedidos p ON c.id = p.cliente_id
GROUP BY c.id, c.nome, c.cidade, c.uf
ORDER BY total_pedidos DESC
LIMIT 20;

-- Clientes por UF
SELECT 
  uf,
  COUNT(*) AS quantidade_clientes,
  COUNT(DISTINCT p.id) AS pedidos_realizados
FROM clientes c
LEFT JOIN pedidos p ON c.id = p.cliente_id
GROUP BY uf
ORDER BY quantidade_clientes DESC;

-- Clientes sem pedidos
SELECT 
  c.id,
  c.nome,
  c.email,
  c.telefone,
  c.cidade,
  c.uf,
  c.created_at
FROM clientes c
LEFT JOIN pedidos p ON c.id = p.cliente_id
WHERE p.id IS NULL
ORDER BY c.created_at DESC;

-- ============================================
-- 5. GERENCIAMENTO DE PEDIDOS
-- ============================================

-- Pedidos recentes (últimos 30 dias)
SELECT 
  p.numero_pedido,
  p.status,
  p.valor_total,
  c.nome AS cliente,
  v.nome AS vendedor,
  p.created_at
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
INNER JOIN users v ON p.vendedor_id = v.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY p.created_at DESC;

-- Detalhes completos de um pedido
/*
SELECT 
  p.numero_pedido,
  p.status,
  p.valor_total,
  p.observacoes,
  p.created_at,
  c.nome AS cliente_nome,
  c.email AS cliente_email,
  c.telefone AS cliente_telefone,
  c.documento AS cliente_documento,
  c.endereco AS cliente_endereco,
  c.cidade AS cliente_cidade,
  c.uf AS cliente_uf,
  v.nome AS vendedor_nome,
  v.email AS vendedor_email,
  cam.marca || ' ' || cam.modelo AS caminhao
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
INNER JOIN users v ON p.vendedor_id = v.id
INNER JOIN caminhoes cam ON p.caminhao_id = cam.id
WHERE p.numero_pedido = 'PED-XXXX'; -- Substituir pelo número do pedido
*/

-- Itens de um pedido
/*
SELECT 
  pi.tipo,
  CASE 
    WHEN pi.tipo = 'guindaste' THEN g.modelo
    ELSE pi.descricao
  END AS item,
  pi.quantidade,
  pi.preco_unitario,
  pi.quantidade * pi.preco_unitario AS subtotal
FROM pedido_itens pi
LEFT JOIN guindastes g ON pi.item_id = g.id AND pi.tipo = 'guindaste'
WHERE pi.pedido_id = 1; -- Substituir pelo ID do pedido
*/

-- Alterar status de um pedido
/*
UPDATE pedidos 
SET status = 'aprovado' 
WHERE numero_pedido = 'PED-XXXX';
*/

-- ============================================
-- 6. ANÁLISES E ESTATÍSTICAS
-- ============================================

-- Faturamento por mês (últimos 12 meses)
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') AS mes,
  COUNT(*) AS pedidos,
  SUM(valor_total) AS faturamento,
  AVG(valor_total) AS ticket_medio
FROM pedidos
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY mes DESC;

-- Evolução de vendas (comparativo ano a ano)
SELECT 
  EXTRACT(YEAR FROM created_at) AS ano,
  EXTRACT(MONTH FROM created_at) AS mes,
  COUNT(*) AS pedidos,
  SUM(valor_total) AS faturamento
FROM pedidos
WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
ORDER BY ano DESC, mes DESC;

-- Taxa de conversão por vendedor (clientes vs pedidos)
SELECT 
  v.nome AS vendedor,
  COUNT(DISTINCT c.id) AS clientes_cadastrados,
  COUNT(p.id) AS pedidos_realizados,
  ROUND(COUNT(p.id)::DECIMAL / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2) AS taxa_conversao
FROM users v
LEFT JOIN pedidos p ON v.id = p.vendedor_id
LEFT JOIN clientes c ON p.cliente_id = c.id
WHERE v.tipo = 'vendedor'
GROUP BY v.id, v.nome
ORDER BY taxa_conversao DESC;

-- ============================================
-- 7. GERENCIAMENTO DE FRETES
-- ============================================

-- Listar todos os fretes ordenados por valor
SELECT 
  cidade,
  oficina,
  valor_prioridade,
  valor_reaproveitamento,
  valor_prioridade - valor_reaproveitamento AS diferenca
FROM fretes
ORDER BY valor_prioridade DESC;

-- Adicionar novo frete
/*
INSERT INTO fretes (cidade, oficina, valor_prioridade, valor_reaproveitamento, observacoes)
VALUES ('Nova Cidade', 'Oficina Nova', 2000.00, 1500.00, 'Nova rota de entrega');
*/

-- Atualizar valores de frete
/*
UPDATE fretes 
SET valor_prioridade = 6000.00, valor_reaproveitamento = 3500.00
WHERE cidade = 'Santa Rosa' AND oficina = 'Agiltec';
*/

-- ============================================
-- 8. PRONTA ENTREGA
-- ============================================

-- Guindastes disponíveis em estoque
SELECT 
  g.modelo,
  g.subgrupo,
  pe.quantidade,
  pe.localizacao,
  pe.status,
  pe.created_at
FROM pronta_entrega pe
INNER JOIN guindastes g ON pe.guindaste_id = g.id
WHERE pe.status = 'disponivel'
ORDER BY pe.created_at DESC;

-- Adicionar item à pronta entrega
/*
INSERT INTO pronta_entrega (guindaste_id, quantidade, localizacao, status, observacoes)
VALUES (1, 3, 'Depósito Porto Alegre', 'disponivel', 'Chegaram hoje');
*/

-- Atualizar quantidade em estoque
/*
UPDATE pronta_entrega 
SET quantidade = 5 
WHERE id = 1;
*/

-- Marcar item como vendido
/*
UPDATE pronta_entrega 
SET status = 'vendido', quantidade = quantidade - 1
WHERE id = 1 AND quantidade > 0;
*/

-- ============================================
-- 9. LIMPEZA E MANUTENÇÃO
-- ============================================

-- Remover pedidos de teste (CUIDADO!)
/*
DELETE FROM pedidos 
WHERE numero_pedido LIKE 'TEST_%' 
AND created_at < CURRENT_DATE - INTERVAL '30 days';
*/

-- Remover clientes sem pedidos e antigos (CUIDADO!)
/*
DELETE FROM clientes 
WHERE id NOT IN (SELECT DISTINCT cliente_id FROM pedidos)
AND created_at < CURRENT_DATE - INTERVAL '1 year';
*/

-- Limpar eventos de logística antigos
/*
DELETE FROM eventos_logistica 
WHERE data < CURRENT_DATE - INTERVAL '6 months';
*/

-- ============================================
-- 10. BACKUP E EXPORTAÇÃO
-- ============================================

-- Exportar lista de clientes (copiar resultado para CSV)
/*
COPY (
  SELECT 
    nome,
    email,
    telefone,
    documento,
    cidade,
    uf
  FROM clientes
  ORDER BY nome
) TO '/tmp/clientes_export.csv' WITH CSV HEADER;
*/

-- Exportar pedidos do último mês (copiar resultado para CSV)
/*
COPY (
  SELECT 
    p.numero_pedido,
    p.created_at,
    c.nome AS cliente,
    v.nome AS vendedor,
    p.status,
    p.valor_total
  FROM pedidos p
  INNER JOIN clientes c ON p.cliente_id = c.id
  INNER JOIN users v ON p.vendedor_id = v.id
  WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  ORDER BY p.created_at DESC
) TO '/tmp/pedidos_mes_atual.csv' WITH CSV HEADER;
*/

-- ============================================
-- 11. VERIFICAÇÃO DE INTEGRIDADE
-- ============================================

-- Verificar foreign keys órfãs
SELECT 'Pedidos sem cliente' AS problema, COUNT(*) AS quantidade
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'Pedidos sem vendedor', COUNT(*)
FROM pedidos p
LEFT JOIN users v ON p.vendedor_id = v.id
WHERE v.id IS NULL

UNION ALL

SELECT 'Caminhões sem cliente', COUNT(*)
FROM caminhoes cam
LEFT JOIN clientes c ON cam.cliente_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'Preços sem guindaste', COUNT(*)
FROM precos_guindaste_regiao p
LEFT JOIN guindastes g ON p.guindaste_id = g.id
WHERE g.id IS NULL;

-- Verificar tabelas e tamanhos
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 12. OTIMIZAÇÃO DE PERFORMANCE
-- ============================================

-- Atualizar estatísticas de todas as tabelas
ANALYZE;

-- Vacuum completo (libera espaço, pode demorar)
-- Execute em horário de baixo uso
/*
VACUUM FULL ANALYZE;
*/

-- Reindexar todas as tabelas (melhora performance de consultas)
-- Execute em horário de baixo uso
/*
REINDEX DATABASE nome_do_banco;
*/

-- Verificar queries lentas (se extensão pg_stat_statements estiver ativa)
/*
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
*/

-- ============================================
-- FIM DAS QUERIES DE MANUTENÇÃO
-- ============================================

