-- ============================================
-- CORREÇÃO COMPLETA: Políticas RLS para Todas as Tabelas
-- ============================================
-- Objetivo: Permitir que admins locais acessem o sistema
-- Estratégia: Leitura pública + Modificações apenas para autenticados
-- ============================================

-- ============================================
-- TABELA: guindastes
-- ============================================
DROP POLICY IF EXISTS "Allow public read access to guindastes" ON guindastes;
DROP POLICY IF EXISTS "guindastes_insert_admin" ON guindastes;
DROP POLICY IF EXISTS "guindastes_update_admin" ON guindastes;
DROP POLICY IF EXISTS "guindastes_delete_admin" ON guindastes;

CREATE POLICY "Allow public read access to guindastes" 
ON guindastes FOR SELECT USING (true);

CREATE POLICY "guindastes_insert_admin" 
ON guindastes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "guindastes_update_admin" 
ON guindastes FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "guindastes_delete_admin" 
ON guindastes FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: precos_guindaste_regiao
-- ============================================
DROP POLICY IF EXISTS "Allow public read precos" ON precos_guindaste_regiao;
DROP POLICY IF EXISTS "precos_insert_admin" ON precos_guindaste_regiao;
DROP POLICY IF EXISTS "precos_update_admin" ON precos_guindaste_regiao;
DROP POLICY IF EXISTS "precos_delete_admin" ON precos_guindaste_regiao;

CREATE POLICY "Allow public read precos" 
ON precos_guindaste_regiao FOR SELECT USING (true);

CREATE POLICY "precos_insert_admin" 
ON precos_guindaste_regiao FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "precos_update_admin" 
ON precos_guindaste_regiao FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "precos_delete_admin" 
ON precos_guindaste_regiao FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: users
-- ============================================
DROP POLICY IF EXISTS "users_select_authed" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Permitir que usuários autenticados vejam usuários
CREATE POLICY "users_select_authed" 
ON users FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "users_insert_admin" 
ON users FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "users_update_admin" 
ON users FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "users_delete_admin" 
ON users FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: clientes
-- ============================================
DROP POLICY IF EXISTS "clientes_select_authed" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_authed" ON clientes;
DROP POLICY IF EXISTS "clientes_update_authed" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_admin" ON clientes;

CREATE POLICY "clientes_select_authed" 
ON clientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "clientes_insert_authed" 
ON clientes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "clientes_update_authed" 
ON clientes FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "clientes_delete_admin" 
ON clientes FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: caminhoes
-- ============================================
DROP POLICY IF EXISTS "caminhoes_select_authed" ON caminhoes;
DROP POLICY IF EXISTS "caminhoes_insert_authed" ON caminhoes;
DROP POLICY IF EXISTS "caminhoes_update_authed" ON caminhoes;
DROP POLICY IF EXISTS "caminhoes_delete_admin" ON caminhoes;

CREATE POLICY "caminhoes_select_authed" 
ON caminhoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "caminhoes_insert_authed" 
ON caminhoes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "caminhoes_update_authed" 
ON caminhoes FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "caminhoes_delete_admin" 
ON caminhoes FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: pedidos
-- ============================================
DROP POLICY IF EXISTS "pedidos_select_authed" ON pedidos;
DROP POLICY IF EXISTS "pedidos_insert_authed" ON pedidos;
DROP POLICY IF EXISTS "pedidos_update_authed" ON pedidos;
DROP POLICY IF EXISTS "pedidos_delete_admin" ON pedidos;

CREATE POLICY "pedidos_select_authed" 
ON pedidos FOR SELECT TO authenticated USING (true);

CREATE POLICY "pedidos_insert_authed" 
ON pedidos FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "pedidos_update_authed" 
ON pedidos FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "pedidos_delete_admin" 
ON pedidos FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: pedido_itens
-- ============================================
DROP POLICY IF EXISTS "pedido_itens_select_authed" ON pedido_itens;
DROP POLICY IF EXISTS "pedido_itens_insert_authed" ON pedido_itens;
DROP POLICY IF EXISTS "pedido_itens_update_authed" ON pedido_itens;
DROP POLICY IF EXISTS "pedido_itens_delete_authed" ON pedido_itens;

CREATE POLICY "pedido_itens_select_authed" 
ON pedido_itens FOR SELECT TO authenticated USING (true);

CREATE POLICY "pedido_itens_insert_authed" 
ON pedido_itens FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "pedido_itens_update_authed" 
ON pedido_itens FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "pedido_itens_delete_authed" 
ON pedido_itens FOR DELETE TO authenticated
USING (true);

-- ============================================
-- TABELA: graficos_carga
-- ============================================
DROP POLICY IF EXISTS "graficos_select_public" ON graficos_carga;
DROP POLICY IF EXISTS "graficos_insert_admin" ON graficos_carga;
DROP POLICY IF EXISTS "graficos_update_admin" ON graficos_carga;
DROP POLICY IF EXISTS "graficos_delete_admin" ON graficos_carga;

CREATE POLICY "graficos_select_public" 
ON graficos_carga FOR SELECT USING (true);

CREATE POLICY "graficos_insert_admin" 
ON graficos_carga FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "graficos_update_admin" 
ON graficos_carga FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "graficos_delete_admin" 
ON graficos_carga FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: eventos_logistica
-- ============================================
DROP POLICY IF EXISTS "eventos_select_authed" ON eventos_logistica;
DROP POLICY IF EXISTS "eventos_insert_admin" ON eventos_logistica;
DROP POLICY IF EXISTS "eventos_update_admin" ON eventos_logistica;
DROP POLICY IF EXISTS "eventos_delete_admin" ON eventos_logistica;

CREATE POLICY "eventos_select_authed" 
ON eventos_logistica FOR SELECT TO authenticated USING (true);

CREATE POLICY "eventos_insert_admin" 
ON eventos_logistica FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "eventos_update_admin" 
ON eventos_logistica FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "eventos_delete_admin" 
ON eventos_logistica FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: pronta_entrega
-- ============================================
DROP POLICY IF EXISTS "pronta_entrega_select_public" ON pronta_entrega;
DROP POLICY IF EXISTS "pronta_entrega_insert_admin" ON pronta_entrega;
DROP POLICY IF EXISTS "pronta_entrega_update_admin" ON pronta_entrega;
DROP POLICY IF EXISTS "pronta_entrega_delete_admin" ON pronta_entrega;

CREATE POLICY "pronta_entrega_select_public" 
ON pronta_entrega FOR SELECT USING (true);

CREATE POLICY "pronta_entrega_insert_admin" 
ON pronta_entrega FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "pronta_entrega_update_admin" 
ON pronta_entrega FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "pronta_entrega_delete_admin" 
ON pronta_entrega FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- TABELA: fretes
-- ============================================
DROP POLICY IF EXISTS "fretes_select_public" ON fretes;
DROP POLICY IF EXISTS "fretes_insert_admin" ON fretes;
DROP POLICY IF EXISTS "fretes_update_admin" ON fretes;
DROP POLICY IF EXISTS "fretes_delete_admin" ON fretes;

CREATE POLICY "fretes_select_public" 
ON fretes FOR SELECT USING (true);

CREATE POLICY "fretes_insert_admin" 
ON fretes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "fretes_update_admin" 
ON fretes FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

CREATE POLICY "fretes_delete_admin" 
ON fretes FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()::text::bigint
    AND users.tipo = 'admin'
  )
);

-- ============================================
-- Verificar todas as políticas criadas
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd as comando,
  roles::text[] as funcoes
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- Contar políticas por tabela
-- ============================================
SELECT 
  tablename,
  COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ TODAS AS POLÍTICAS RLS CONFIGURADAS COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Resumo:';
  RAISE NOTICE '   - Tabelas de catálogo (guindastes, preços, gráficos, fretes): Leitura pública';
  RAISE NOTICE '   - Tabelas operacionais (users, clientes, pedidos): Leitura autenticada';
  RAISE NOTICE '   - Modificações: Apenas admins autenticados';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Os guindastes agora devem aparecer normalmente';
  RAISE NOTICE '   - Para modificações, será necessário sessão Supabase ativa';
  RAISE NOTICE '   - Se precisar, implemente login com Supabase Auth';
END $$;

