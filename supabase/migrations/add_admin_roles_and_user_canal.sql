-- Migração: novos perfis administrativos e vínculo por canal
-- Adiciona coluna `canal` em app_users e padroniza perfis admin.

-- 1. Coluna canal para vincular usuários (vendedores e admins) a um canal comercial
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS canal TEXT;

COMMENT ON COLUMN public.app_users.canal IS
  'Canal comercial do usuário: interno, representantes, concessionarias, comercio_exterior';

-- 2. Padroniza perfil master como admin_full
UPDATE public.app_users
  SET tipo = 'admin_full'
  WHERE tipo IN ('admin_stark', 'admin');

-- 3. Define canal dos perfis operacionais e administrativos existentes
UPDATE public.app_users
  SET canal = 'concessionarias'
  WHERE tipo = 'vendedor_concessionaria'
    AND (canal IS NULL OR canal = '');

UPDATE public.app_users
  SET canal = 'comercio_exterior'
  WHERE tipo = 'vendedor_exterior'
    AND (canal IS NULL OR canal = '');

UPDATE public.app_users
  SET canal = 'representantes'
  WHERE tipo = 'vendedor'
    AND (canal IS NULL OR canal = '');

UPDATE public.app_users
  SET canal = 'concessionarias'
  WHERE tipo = 'admin_concessionaria'
    AND (canal IS NULL OR canal = '');

UPDATE public.app_users
  SET canal = 'representantes'
  WHERE tipo = 'admin_representantes'
    AND (canal IS NULL OR canal = '');

UPDATE public.app_users
  SET canal = 'comercio_exterior'
  WHERE tipo = 'admin_comercio_exterior'
    AND (canal IS NULL OR canal = '');

UPDATE public.app_users
  SET canal = 'interno'
  WHERE tipo = 'admin_canal_interno'
    AND (canal IS NULL OR canal = '');
