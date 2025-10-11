-- ============================================
-- EXEMPLOS PRÁTICOS E DEMONSTRAÇÕES
-- Configurador de Guindastes - Sistema de Orçamentos
-- ============================================
--
-- Este arquivo contém exemplos práticos de uso do banco de dados
-- Use como referência para entender como o sistema funciona
--
-- ============================================

-- ============================================
-- EXEMPLO 1: Criar um novo vendedor
-- ============================================

-- Passo a passo completo
INSERT INTO users (
  nome,
  email,
  telefone,
  cpf,
  tipo,
  comissao,
  regiao,
  senha, -- Hash SHA-256 de "vendedor123"
  ativo
) VALUES (
  'Carlos Mendes',
  'carlos.mendes@guindastes.com',
  '(41) 98765-4321',
  '555.555.555-55',
  'vendedor',
  5.00, -- 5% de comissão
  'sul-sudeste',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  true
);

-- Verificar se foi criado
SELECT id, nome, email, regiao, comissao 
FROM users 
WHERE email = 'carlos.mendes@guindastes.com';

-- ============================================
-- EXEMPLO 2: Cadastrar um novo guindaste completo
-- ============================================

-- Passo 1: Inserir o guindaste
WITH novo_guindaste AS (
  INSERT INTO guindastes (
    subgrupo,
    modelo,
    peso_kg,
    configuracao,
    tem_contr,
    codigo_referencia,
    descricao,
    nao_incluido
  ) VALUES (
    'Articulado',
    'GSI 5000',
    920.00,
    'CR, EH, ECL, ECS, P, GR, EST',
    true,
    'GSI-5000',
    'Guindaste articulado de alta capacidade com 5 toneladas. Inclui controle remoto wireless de última geração, sistema de estabilizadores automáticos, rotação 360° contínua e garra hidráulica multifuncional. Ideal para operações pesadas.',
    'Instalação, frete, treinamento operacional, certificação INMETRO, seguro de transporte'
  )
  RETURNING id
)
-- Passo 2: Configurar preços para todas as regiões
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
SELECT 
  id,
  regiao,
  preco
FROM novo_guindaste
CROSS JOIN (
  VALUES 
    ('norte-nordeste', 106000.00),
    ('sul-sudeste', 92000.00),
    ('centro-oeste', 99000.00),
    ('rs-com-ie', 87400.00),  -- 5% desconto
    ('rs-sem-ie', 92000.00)
) AS precos(regiao, preco);

-- Verificar guindaste criado
SELECT 
  g.id,
  g.modelo,
  g.peso_kg,
  COUNT(p.id) AS regioes_configuradas,
  STRING_AGG(p.regiao || ': R$ ' || p.preco, ', ' ORDER BY p.regiao) AS precos
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
WHERE g.modelo = 'GSI 5000'
GROUP BY g.id, g.modelo, g.peso_kg;

-- ============================================
-- EXEMPLO 3: Cadastrar cliente e caminhão
-- ============================================

-- Passo 1: Criar cliente
WITH novo_cliente AS (
  INSERT INTO clientes (
    nome,
    telefone,
    email,
    documento,
    inscricao_estadual,
    endereco,
    cidade,
    uf,
    cep,
    observacoes
  ) VALUES (
    'Transportes Rapidão Ltda',
    '(51) 3344-5566',
    'contato@transportesrapidao.com.br',
    '98.765.432/0001-10',
    '987.654.321', -- Tem IE
    'Av. dos Transportadores, 500 - Distrito Industrial',
    'Caxias do Sul',
    'RS',
    '95000-000',
    'Cliente VIP - Compra recorrente'
  )
  RETURNING id, nome
)
-- Passo 2: Criar caminhão para o cliente
INSERT INTO caminhoes (
  cliente_id,
  tipo,
  marca,
  modelo,
  ano,
  voltagem,
  placa,
  observacoes
)
SELECT 
  id,
  'Bitruck',
  'Volvo',
  'VM 330',
  2023,
  '24V',
  'IXY9876',
  'Caminhão novo, pronto para instalação'
FROM novo_cliente
RETURNING id, tipo, marca, modelo;

-- Verificar dados criados
SELECT 
  c.nome AS cliente,
  c.cidade,
  c.uf,
  CASE 
    WHEN c.inscricao_estadual IS NOT NULL AND c.inscricao_estadual != '' 
    THEN 'Sim' 
    ELSE 'Não' 
  END AS tem_ie,
  cam.marca || ' ' || cam.modelo AS caminhao,
  cam.placa
FROM clientes c
LEFT JOIN caminhoes cam ON c.id = cam.cliente_id
WHERE c.documento = '98.765.432/0001-10';

-- ============================================
-- EXEMPLO 4: Simular um pedido completo
-- ============================================

-- Este exemplo simula todo o fluxo de criação de um pedido
-- Como seria feito pela aplicação

DO $$
DECLARE
  v_cliente_id BIGINT;
  v_vendedor_id BIGINT;
  v_caminhao_id BIGINT;
  v_guindaste_id BIGINT;
  v_pedido_id BIGINT;
  v_numero_pedido VARCHAR(50);
  v_preco_guindaste DECIMAL(10,2);
  v_valor_total DECIMAL(12,2);
BEGIN
  -- Buscar IDs necessários
  SELECT id INTO v_cliente_id 
  FROM clientes 
  WHERE documento = '98.765.432/0001-10';
  
  SELECT id INTO v_vendedor_id 
  FROM users 
  WHERE email = 'hugo.ferreira@guindastes.com' AND tipo = 'vendedor';
  
  SELECT id INTO v_caminhao_id 
  FROM caminhoes 
  WHERE cliente_id = v_cliente_id 
  LIMIT 1;
  
  SELECT id INTO v_guindaste_id 
  FROM guindastes 
  WHERE modelo = 'GSI 2500';
  
  -- Buscar preço do guindaste para a região do vendedor
  -- Vendedor Hugo é do RS, cliente tem IE, então usa rs-com-ie
  SELECT preco INTO v_preco_guindaste
  FROM precos_guindaste_regiao
  WHERE guindaste_id = v_guindaste_id 
  AND regiao = 'rs-com-ie';
  
  -- Calcular valor total (pode ter descontos, acréscimos, etc)
  v_valor_total := v_preco_guindaste;
  
  -- Gerar número do pedido
  v_numero_pedido := 'PED-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Criar pedido
  INSERT INTO pedidos (
    numero_pedido,
    cliente_id,
    vendedor_id,
    caminhao_id,
    status,
    valor_total,
    observacoes,
    dados_completos
  ) VALUES (
    v_numero_pedido,
    v_cliente_id,
    v_vendedor_id,
    v_caminhao_id,
    'pendente',
    v_valor_total,
    'Pedido com desconto de IE aplicado',
    jsonb_build_object(
      'guindaste', 'GSI 2500',
      'regiao', 'rs-com-ie',
      'cliente_tem_ie', true
    )
  ) RETURNING id INTO v_pedido_id;
  
  -- Adicionar item ao pedido
  INSERT INTO pedido_itens (
    pedido_id,
    tipo,
    item_id,
    quantidade,
    preco_unitario,
    codigo_produto,
    descricao
  ) VALUES (
    v_pedido_id,
    'guindaste',
    v_guindaste_id,
    1,
    v_preco_guindaste,
    'GSI-2500',
    'Guindaste Articulado GSI 2500 - 2.5t'
  );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PEDIDO CRIADO COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Número: %', v_numero_pedido;
  RAISE NOTICE 'Valor Total: R$ %', v_valor_total;
  RAISE NOTICE 'Cliente ID: %', v_cliente_id;
  RAISE NOTICE 'Vendedor ID: %', v_vendedor_id;
  RAISE NOTICE 'Guindaste: GSI 2500';
  RAISE NOTICE 'Região: RS com IE';
  RAISE NOTICE '========================================';
END $$;

-- Verificar pedido criado
SELECT 
  p.numero_pedido,
  p.status,
  p.valor_total,
  c.nome AS cliente,
  v.nome AS vendedor,
  g.modelo AS guindaste,
  pi.preco_unitario AS preco_guindaste,
  p.created_at
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
INNER JOIN users v ON p.vendedor_id = v.id
INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
LEFT JOIN guindastes g ON pi.item_id = g.id AND pi.tipo = 'guindaste'
ORDER BY p.created_at DESC
LIMIT 1;

-- ============================================
-- EXEMPLO 5: Consultar preços de um guindaste para todas as regiões
-- ============================================

SELECT 
  g.modelo,
  g.subgrupo,
  g.peso_kg,
  p.regiao,
  TO_CHAR(p.preco, 'FM999G999G999D00') AS preco_formatado,
  CASE p.regiao
    WHEN 'norte-nordeste' THEN 'Norte e Nordeste'
    WHEN 'sul-sudeste' THEN 'Sul e Sudeste'
    WHEN 'centro-oeste' THEN 'Centro-Oeste'
    WHEN 'rs-com-ie' THEN 'Rio Grande do Sul (COM Inscrição Estadual)'
    WHEN 'rs-sem-ie' THEN 'Rio Grande do Sul (SEM Inscrição Estadual)'
  END AS descricao_regiao
FROM guindastes g
INNER JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
WHERE g.modelo = 'GSI 2500'
ORDER BY p.preco ASC;

-- ============================================
-- EXEMPLO 6: Relatório de vendas do vendedor
-- ============================================

-- Vendas dos últimos 3 meses de um vendedor específico
SELECT 
  p.numero_pedido,
  p.created_at AS data_pedido,
  c.nome AS cliente,
  c.cidade || '/' || c.uf AS localizacao,
  g.modelo AS guindaste,
  p.valor_total,
  p.status,
  CASE 
    WHEN p.status = 'concluido' THEN p.valor_total * (v.comissao / 100)
    ELSE 0
  END AS comissao_valor
FROM pedidos p
INNER JOIN users v ON p.vendedor_id = v.id
INNER JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
LEFT JOIN guindastes g ON pi.item_id = g.id AND pi.tipo = 'guindaste'
WHERE 
  v.email = 'hugo.ferreira@guindastes.com'
  AND p.created_at >= CURRENT_DATE - INTERVAL '3 months'
ORDER BY p.created_at DESC;

-- Resumo do vendedor
SELECT 
  v.nome AS vendedor,
  v.regiao,
  COUNT(p.id) AS total_pedidos,
  COUNT(CASE WHEN p.status = 'concluido' THEN 1 END) AS pedidos_concluidos,
  SUM(p.valor_total) AS faturamento_total,
  SUM(CASE 
    WHEN p.status = 'concluido' 
    THEN p.valor_total * (v.comissao / 100) 
    ELSE 0 
  END) AS comissao_total,
  ROUND(AVG(p.valor_total), 2) AS ticket_medio
FROM users v
LEFT JOIN pedidos p ON v.id = p.vendedor_id
WHERE 
  v.email = 'hugo.ferreira@guindastes.com'
  AND (p.created_at >= CURRENT_DATE - INTERVAL '3 months' OR p.id IS NULL)
GROUP BY v.id, v.nome, v.regiao;

-- ============================================
-- EXEMPLO 7: Atualizar preços com reajuste percentual
-- ============================================

-- Aplicar reajuste de 8% em todos os guindastes da região sul-sudeste
DO $$
DECLARE
  registros_afetados INTEGER;
BEGIN
  UPDATE precos_guindaste_regiao
  SET preco = preco * 1.08
  WHERE regiao = 'sul-sudeste';
  
  GET DIAGNOSTICS registros_afetados = ROW_COUNT;
  
  RAISE NOTICE '✅ Reajuste aplicado: % guindastes atualizados', registros_afetados;
  RAISE NOTICE '📊 Nova tabela de preços para sul-sudeste:';
END $$;

-- Verificar novos preços
SELECT 
  g.modelo,
  TO_CHAR(p.preco, 'FM999G999G999D00') AS preco_novo
FROM guindastes g
INNER JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
WHERE p.regiao = 'sul-sudeste'
ORDER BY g.modelo;

-- ============================================
-- EXEMPLO 8: Buscar guindastes por características
-- ============================================

-- Buscar guindastes articulados com controle remoto até 3t
SELECT 
  g.modelo,
  g.subgrupo,
  g.peso_kg,
  g.configuracao,
  g.tem_contr,
  MIN(p.preco) AS preco_minimo,
  MAX(p.preco) AS preco_maximo
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
WHERE 
  g.subgrupo = 'Articulado'
  AND g.tem_contr = true
  AND g.peso_kg <= 3000
GROUP BY g.id, g.modelo, g.subgrupo, g.peso_kg, g.configuracao, g.tem_contr
ORDER BY g.peso_kg;

-- ============================================
-- EXEMPLO 9: Análise de clientes por região
-- ============================================

-- Distribuição de clientes e pedidos por UF
SELECT 
  c.uf,
  COUNT(DISTINCT c.id) AS total_clientes,
  COUNT(p.id) AS total_pedidos,
  COALESCE(SUM(p.valor_total), 0) AS faturamento_total,
  ROUND(COALESCE(AVG(p.valor_total), 0), 2) AS ticket_medio,
  ROUND(
    COUNT(p.id)::DECIMAL / NULLIF(COUNT(DISTINCT c.id), 0),
    2
  ) AS pedidos_por_cliente
FROM clientes c
LEFT JOIN pedidos p ON c.id = p.cliente_id
GROUP BY c.uf
ORDER BY faturamento_total DESC;

-- ============================================
-- EXEMPLO 10: Calcular estoque disponível de pronta entrega
-- ============================================

-- Guindastes disponíveis com valor de estoque
SELECT 
  g.modelo,
  g.subgrupo,
  pe.quantidade AS estoque,
  pe.localizacao,
  MIN(p.preco) AS preco_unitario_minimo,
  pe.quantidade * MIN(p.preco) AS valor_estoque
FROM pronta_entrega pe
INNER JOIN guindastes g ON pe.guindaste_id = g.id
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
WHERE pe.status = 'disponivel'
GROUP BY g.id, g.modelo, g.subgrupo, pe.quantidade, pe.localizacao
ORDER BY valor_estoque DESC;

-- Resumo total do estoque
SELECT 
  COUNT(DISTINCT pe.guindaste_id) AS modelos_diferentes,
  SUM(pe.quantidade) AS unidades_total,
  TO_CHAR(
    SUM(pe.quantidade * (
      SELECT MIN(preco) 
      FROM precos_guindaste_regiao 
      WHERE guindaste_id = pe.guindaste_id
    )),
    'FM999G999G999D00'
  ) AS valor_total_estoque
FROM pronta_entrega pe
WHERE pe.status = 'disponivel';

-- ============================================
-- EXEMPLO 11: Exportar dados para relatório (formato CSV)
-- ============================================

-- Lista de todos os guindastes com preços
/*
COPY (
  SELECT 
    g.codigo_referencia,
    g.modelo,
    g.subgrupo,
    g.peso_kg,
    g.configuracao,
    CASE WHEN g.tem_contr THEN 'Sim' ELSE 'Não' END AS controle_remoto,
    p.regiao,
    p.preco
  FROM guindastes g
  LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
  ORDER BY g.subgrupo, g.modelo, p.regiao
) TO '/tmp/catalogo_guindastes.csv' WITH CSV HEADER DELIMITER ';';
*/

-- ============================================
-- EXEMPLO 12: Análise de performance de vendas
-- ============================================

-- Top 5 guindastes mais vendidos nos últimos 6 meses
SELECT 
  g.modelo,
  g.subgrupo,
  COUNT(pi.id) AS vezes_vendido,
  SUM(pi.quantidade) AS unidades_vendidas,
  TO_CHAR(
    SUM(pi.preco_unitario * pi.quantidade),
    'FM999G999G999D00'
  ) AS receita_total,
  ROUND(
    AVG(pi.preco_unitario),
    2
  ) AS preco_medio_venda
FROM pedido_itens pi
INNER JOIN guindastes g ON pi.item_id = g.id
INNER JOIN pedidos p ON pi.pedido_id = p.id
WHERE 
  pi.tipo = 'guindaste'
  AND p.created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY g.id, g.modelo, g.subgrupo
ORDER BY unidades_vendidas DESC
LIMIT 5;

-- ============================================
-- EXEMPLO 13: Verificar integridade dos dados
-- ============================================

-- Guindastes sem preço configurado em alguma região
SELECT 
  g.modelo,
  STRING_AGG(
    CASE 
      WHEN p_nn.id IS NULL THEN 'norte-nordeste' 
    END, ', '
  ) AS regioes_faltantes
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p_nn ON g.id = p_nn.guindaste_id AND p_nn.regiao = 'norte-nordeste'
WHERE p_nn.id IS NULL
GROUP BY g.id, g.modelo
HAVING COUNT(*) > 0;

-- Clientes sem nenhum pedido
SELECT 
  c.nome,
  c.cidade,
  c.uf,
  c.telefone,
  c.email,
  c.created_at AS cadastrado_em
FROM clientes c
LEFT JOIN pedidos p ON c.id = p.cliente_id
WHERE p.id IS NULL
ORDER BY c.created_at DESC;

-- ============================================
-- FIM DOS EXEMPLOS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📚 EXEMPLOS CARREGADOS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '💡 DICAS:';
  RAISE NOTICE '1. Use estes exemplos como referência';
  RAISE NOTICE '2. Adapte conforme suas necessidades';
  RAISE NOTICE '3. Sempre teste em ambiente de desenvolvimento primeiro';
  RAISE NOTICE '4. Faça backup antes de modificações importantes';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Para mais queries úteis, veja:';
  RAISE NOTICE '   - maintenance_queries.sql';
  RAISE NOTICE '   - README.md';
  RAISE NOTICE '';
END $$;

