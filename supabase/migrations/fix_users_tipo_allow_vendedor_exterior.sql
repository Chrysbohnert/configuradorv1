-- Corrige erro 400 ao inserir vendedor_exterior na tabela users
-- Causa comum: CHECK constraint em users.tipo não inclui 'vendedor_exterior'

DO $$
DECLARE
  c record;
BEGIN
  -- Procura constraints CHECK na tabela users envolvendo a coluna tipo
  FOR c IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;

  -- Recria constraint permitindo vendedor_exterior
  -- Ajuste a lista se você tiver outros tipos adicionais no futuro.
  EXECUTE 'ALTER TABLE public.users '
    || 'ADD CONSTRAINT users_tipo_check '
    || 'CHECK (tipo IN (''admin'',''vendedor'',''vendedor_exterior'',''admin_concessionaria'',''vendedor_concessionaria''))';
END $$;
