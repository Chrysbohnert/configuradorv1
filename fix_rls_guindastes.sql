-- ============================================
-- CORREÇÃO: Políticas RLS para Tabela Guindastes
-- ============================================
-- Problema: Admin logado localmente não consegue ver guindastes
-- Causa: RLS está bloqueando acesso porque não há sessão Supabase ativa
-- Solução: Criar políticas que permitam acesso público para leitura
-- ============================================

-- 1. Verificar se RLS está habilitado na tabela guindastes
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'guindastes';

-- 2. Remover políticas antigas que podem estar bloqueando
DROP POLICY IF EXISTS "guindastes_select_authed" ON guindastes;
DROP POLICY IF EXISTS "guindastes_select_admin" ON guindastes;

-- ============================================
-- POLÍTICA 1: Leitura Pública de Guindastes
-- ============================================
-- Permite que qualquer pessoa leia o catálogo de guindastes
-- Justificativa: É um catálogo de produtos, não é informação sensível
CREATE POLICY "Allow public read access to guindastes" 
ON guindastes 
FOR SELECT 
USING (true);

-- ============================================
-- POLÍTICA 2: Apenas Admins Autenticados Podem Inserir
-- ============================================
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

-- ============================================
-- POLÍTICA 3: Apenas Admins Autenticados Podem Atualizar
-- ============================================
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

-- ============================================
-- POLÍTICA 4: Apenas Admins Autenticados Podem Excluir
-- ============================================
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
-- Verificar políticas criadas
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as comando,
  roles::text[] as funcoes,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'guindastes'
ORDER BY policyname;

-- ============================================
-- TESTE: Verificar se a leitura funciona
-- ============================================
-- Este SELECT deve retornar todos os guindastes (mesmo sem autenticação)
SELECT COUNT(*) as total_guindastes FROM guindastes;

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================
-- 1. Copie este arquivo e execute no SQL Editor do Supabase
-- 2. Faça logout da aplicação
-- 3. Faça login novamente
-- 4. Acesse "Gerenciar Guindastes"
-- 5. Os guindastes devem aparecer agora!
-- ============================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ POLÍTICAS RLS CONFIGURADAS COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas criadas:';
  RAISE NOTICE '   1. SELECT → Acesso público (leitura)';
  RAISE NOTICE '   2. INSERT → Apenas admins autenticados';
  RAISE NOTICE '   3. UPDATE → Apenas admins autenticados';
  RAISE NOTICE '   4. DELETE → Apenas admins autenticados';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Guindastes agora podem ser lidos por qualquer pessoa';
  RAISE NOTICE '   - Modificações exigem autenticação Supabase como admin';
  RAISE NOTICE '   - Se precisar mais segurança, ajuste a política SELECT';
END $$;

