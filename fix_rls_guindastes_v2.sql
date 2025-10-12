-- ============================================
-- CORREÇÃO: Políticas RLS para Tabela Guindastes (v2)
-- Remove todas as políticas existentes primeiro
-- ============================================

-- ============================================
-- PASSO 1: Remover TODAS as políticas existentes da tabela guindastes
-- ============================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Loop através de todas as políticas da tabela guindastes
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'guindastes' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON guindastes', pol.policyname);
        RAISE NOTICE 'Política removida: %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ Todas as políticas antigas foram removidas';
END $$;

-- ============================================
-- PASSO 2: Criar novas políticas
-- ============================================

-- POLÍTICA 1: Leitura Pública de Guindastes
CREATE POLICY "Allow public read access to guindastes" 
ON guindastes 
FOR SELECT 
USING (true);

-- POLÍTICA 2: Apenas Admins Autenticados Podem Inserir
CREATE POLICY "guindastes_insert_admin" 
ON guindastes 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- POLÍTICA 3: Apenas Admins Autenticados Podem Atualizar
CREATE POLICY "guindastes_update_admin" 
ON guindastes 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- POLÍTICA 4: Apenas Admins Autenticados Podem Excluir
CREATE POLICY "guindastes_delete_admin" 
ON guindastes 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- PASSO 3: Verificar políticas criadas
-- ============================================
SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text[] as "Funções",
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Inserir'
    WHEN cmd = 'UPDATE' THEN '✏️ Atualizar'
    WHEN cmd = 'DELETE' THEN '🗑️ Excluir'
  END as "Tipo"
FROM pg_policies 
WHERE tablename = 'guindastes'
  AND schemaname = 'public'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- ============================================
-- PASSO 4: Testar se a leitura funciona
-- ============================================
SELECT 
  COUNT(*) as total_guindastes,
  '✅ Guindastes podem ser lidos!' as status
FROM guindastes;

-- Mensagem de sucesso
DO $$
DECLARE
  total_guindastes INT;
BEGIN
  SELECT COUNT(*) INTO total_guindastes FROM guindastes;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ POLÍTICAS RLS CONFIGURADAS COM SUCESSO!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas criadas:';
  RAISE NOTICE '   1. SELECT → Acesso público (qualquer pessoa)';
  RAISE NOTICE '   2. INSERT → Apenas admins autenticados';
  RAISE NOTICE '   3. UPDATE → Apenas admins autenticados';
  RAISE NOTICE '   4. DELETE → Apenas admins autenticados';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Estatísticas:';
  RAISE NOTICE '   - Total de guindastes no banco: %', total_guindastes;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Próximo passo:';
  RAISE NOTICE '   1. Volte para a aplicação';
  RAISE NOTICE '   2. Faça logout';
  RAISE NOTICE '   3. Faça login novamente';
  RAISE NOTICE '   4. Acesse "Gerenciar Guindastes"';
  RAISE NOTICE '   5. Os % guindastes devem aparecer!', total_guindastes;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;

