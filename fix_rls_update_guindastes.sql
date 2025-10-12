-- Política para permitir UPDATE de guindastes para usuários autenticados
CREATE POLICY "guindastes_update_admin" ON public.guindastes
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verificar se a política foi criada
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'guindastes' 
AND policyname = 'guindastes_update_admin';
