-- Execute este SQL diretamente no Supabase Dashboard (SQL Editor)
-- Isso corrigirá o erro 403 que o admin concessionária enfrenta ao salvar preços

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS concessionaria_precos_admin_stark_manage ON public.concessionaria_precos;
DROP POLICY IF EXISTS concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos;
DROP POLICY IF EXISTS concessionaria_precos_vendedor_read ON public.concessionaria_precos;

-- 2. Criar políticas corrigidas
-- Admin Stark pode tudo
CREATE POLICY concessionaria_precos_admin_stark_manage ON public.concessionaria_precos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.tipo = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.tipo = 'admin'
  )
);

-- Admin Concessionária pode gerenciar apenas seus próprios preços
CREATE POLICY concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() 
      AND u.tipo = 'admin_concessionaria' 
      AND u.concessionaria_id = concessionaria_precos.concessionaria_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() 
      AND u.tipo = 'admin_concessionaria' 
      AND u.concessionaria_id = concessionaria_precos.concessionaria_id
  )
);

-- Vendedores podem apenas ler
CREATE POLICY concessionaria_precos_vendedor_read ON public.concessionaria_precos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() 
      AND u.tipo = 'vendedor_concessionaria' 
      AND u.concessionaria_id = concessionaria_precos.concessionaria_id
  )
);

-- 3. Verificação
SELECT 'Políticas RLS atualizadas com sucesso!' as status;
