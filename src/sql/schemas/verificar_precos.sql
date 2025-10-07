-- =====================================================
-- QUERY PARA VERIFICAR PREÇOS POR REGIÃO
-- =====================================================

-- 1. Ver todos os preços agrupados por região
SELECT 
  regiao, 
  COUNT(*) as total_guindastes,
  MIN(preco) as preco_minimo,
  MAX(preco) as preco_maximo,
  ROUND(AVG(preco)::numeric, 2) as preco_medio
FROM precos_guindaste_regiao
GROUP BY regiao
ORDER BY regiao;

-- 2. Ver preços específicos do RS (com IE e sem IE)
SELECT 
  g.subgrupo as guindaste,
  pgr.regiao,
  pgr.preco
FROM precos_guindaste_regiao pgr
JOIN guindastes g ON g.id = pgr.guindaste_id
WHERE pgr.regiao IN ('rs-com-ie', 'rs-sem-ie')
ORDER BY g.subgrupo, pgr.regiao;

-- 3. Verificar se há guindastes sem preço para RS
SELECT 
  g.id,
  g.subgrupo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE guindaste_id = g.id AND regiao = 'rs-com-ie') 
    THEN '✓' ELSE '✗' 
  END as tem_preco_com_ie,
  CASE 
    WHEN EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE guindaste_id = g.id AND regiao = 'rs-sem-ie') 
    THEN '✓' ELSE '✗' 
  END as tem_preco_sem_ie
FROM guindastes g
ORDER BY g.subgrupo
LIMIT 20;

-- 4. Comparar preços com IE vs sem IE (ver se são diferentes)
SELECT 
  g.subgrupo,
  com_ie.preco as preco_com_ie,
  sem_ie.preco as preco_sem_ie,
  (com_ie.preco - sem_ie.preco) as diferenca
FROM guindastes g
LEFT JOIN precos_guindaste_regiao com_ie ON com_ie.guindaste_id = g.id AND com_ie.regiao = 'rs-com-ie'
LEFT JOIN precos_guindaste_regiao sem_ie ON sem_ie.guindaste_id = g.id AND sem_ie.regiao = 'rs-sem-ie'
WHERE com_ie.preco IS NOT NULL OR sem_ie.preco IS NOT NULL
ORDER BY g.subgrupo
LIMIT 20;

