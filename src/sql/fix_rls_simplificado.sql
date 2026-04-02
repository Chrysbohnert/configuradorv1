-- Execute este SQL no Supabase Dashboard para corrigir o problema 403
-- Versão simplificada que permite admin_concessionaria gerenciar preços

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS concessionaria_precos_admin_stark_manage ON public.concessionaria_precos;
DROP POLICY IF EXISTS concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos;
DROP POLICY IF EXISTS concessionaria_precos_vendedor_read ON public.concessionaria_precos;

-- 2. Política para Admin Stark - pode tudo
CREATE POLICY concessionaria_precos_admin_stark_manage ON public.concessionaria_precos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.tipo = 'admin'
  )
);

-- 3. Política para Admin Concessionária - pode tudo na tabela
-- Simplificado: permite qualquer admin_concessionaria operar na tabela
CREATE POLICY concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.tipo = 'admin_concessionaria'
  )
);

-- 4. Política para Vendedores - apenas leitura
CREATE POLICY concessionaria_precos_vendedor_read ON public.concessionaria_precos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.tipo = 'vendedor_concessionaria'
  )
);

-- 5. Verificação
SELECT 'Políticas RLS simplificadas criadas com sucesso!' as status;
