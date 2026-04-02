-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA concessionaria_precos
-- PROBLEMA: Admin Concessionária não conseguia salvar preços (erro 403)
-- CAUSA: Política WITH CHECK estava muito restritiva para upsert
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS concessionaria_precos_admin_stark_manage ON public.concessionaria_precos;
DROP POLICY IF EXISTS concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos;
DROP POLICY IF EXISTS concessionaria_precos_vendedor_read ON public.concessionaria_precos;

-- Policy 1: Admin Stark gerencia TODOS os preços (INSERT, UPDATE, SELECT, DELETE)
CREATE POLICY concessionaria_precos_admin_stark_manage ON public.concessionaria_precos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin'
  )
);

-- Policy 2: Admin Concessionária gerencia SEUS PRÓPRIOS preços (INSERT, UPDATE, SELECT, DELETE)
-- CORREÇÃO: Permitir inserir/update apenas na própria concessionaria_id
CREATE POLICY concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin_concessionaria'
      AND u.concessionaria_id = concessionaria_precos.concessionaria_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin_concessionaria'
      AND u.concessionaria_id = concessionaria_precos.concessionaria_id
  )
);

-- Policy 3: Vendedores da concessionária podem LER seus preços (SELECT apenas)
CREATE POLICY concessionaria_precos_vendedor_read ON public.concessionaria_precos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'vendedor_concessionaria'
      AND u.concessionaria_id = concessionaria_precos.concessionaria_id
  )
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se as políticas foram criadas corretamente
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS atualizadas para concessionaria_precos!';
  RAISE NOTICE '✅ Admin Concessionária agora pode fazer upsert nos seus preços!';
END $$;
