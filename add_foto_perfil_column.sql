-- ============================================
-- Adicionar campo foto_perfil na tabela users
-- ============================================

-- Adicionar coluna foto_perfil
ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_perfil TEXT;

-- Comentário explicativo
COMMENT ON COLUMN users.foto_perfil IS 'URL da foto de perfil do usuário (armazenada no Supabase Storage)';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'foto_perfil';

-- ============================================
-- Criar bucket de storage para perfis (executar apenas uma vez)
-- ============================================

-- No Supabase Dashboard:
-- 1. Vá em Storage
-- 2. Clique em "New bucket"
-- 3. Nome: perfis
-- 4. Public bucket: true (para URLs públicas)
-- 5. Salvar

-- OU execute via SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('perfis', 'perfis', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Políticas RLS para o bucket perfis
-- ============================================

-- Permitir upload autenticado
-- CREATE POLICY "perfis_upload_autenticado"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'perfis');

-- Permitir leitura pública
-- CREATE POLICY "perfis_leitura_publica"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'perfis');

-- Permitir update do próprio arquivo
-- CREATE POLICY "perfis_update_proprio"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'perfis');

-- Permitir delete do próprio arquivo
-- CREATE POLICY "perfis_delete_proprio"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'perfis');

-- ============================================
-- Verificação final
-- ============================================

SELECT 
  'Coluna foto_perfil adicionada com sucesso!' as status,
  COUNT(*) as usuarios_total
FROM users;

