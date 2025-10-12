-- Remover a política restritiva atual
DROP POLICY IF EXISTS "guindastes_update_admin" ON public.guindastes;

-- Criar política mais permissiva para usuários autenticados
CREATE POLICY "guindastes_update_authenticated" ON public.guindastes
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verificar se a nova política foi criada
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'guindastes' 
AND policyname = 'guindastes_update_authenticated';
