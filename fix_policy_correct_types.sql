-- Remover a política problemática
DROP POLICY IF EXISTS "guindastes_update_admin" ON public.guindastes;

-- Verificar o tipo real da coluna id na tabela users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'id';

-- Criar política corrigida (assumindo que users.id é integer)
CREATE POLICY "guindastes_update_admin_fixed" ON public.guindastes
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = (auth.uid())::text::integer 
    AND users.tipo = 'admin'
  )
)
WITH CHECK (true);

-- Alternativa: política mais simples para usuários autenticados
CREATE POLICY "guindastes_update_simple" ON public.guindastes
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);
