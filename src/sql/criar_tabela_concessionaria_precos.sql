-- =====================================================
-- TABELA: concessionaria_precos
-- DESCRIÇÃO: Preços de venda definidos pela concessionária
--            para seus vendedores venderem aos clientes finais
-- =====================================================

CREATE TABLE IF NOT EXISTS public.concessionaria_precos (
  id bigserial PRIMARY KEY,
  concessionaria_id bigint NOT NULL REFERENCES public.concessionarias(id) ON DELETE CASCADE,
  guindaste_id bigint NOT NULL REFERENCES public.guindastes(id) ON DELETE CASCADE,
  preco_override numeric NOT NULL CHECK (preco_override >= 0),
  updated_by bigint REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(concessionaria_id, guindaste_id)
);

-- Comentários
COMMENT ON TABLE public.concessionaria_precos IS 'Preços de venda definidos pela concessionária para seus vendedores';
COMMENT ON COLUMN public.concessionaria_precos.preco_override IS 'Preço de venda que a concessionária cobra de seus vendedores (markup sobre o preço de compra)';
COMMENT ON COLUMN public.concessionaria_precos.updated_by IS 'ID do usuário (admin_concessionaria) que definiu/atualizou o preço';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS concessionaria_precos_set_updated_at ON public.concessionaria_precos;
CREATE TRIGGER concessionaria_precos_set_updated_at
BEFORE UPDATE ON public.concessionaria_precos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_concessionaria_precos_concessionaria 
  ON public.concessionaria_precos(concessionaria_id);
CREATE INDEX IF NOT EXISTS idx_concessionaria_precos_guindaste 
  ON public.concessionaria_precos(guindaste_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.concessionaria_precos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin Stark gerencia TODOS os preços
DROP POLICY IF EXISTS concessionaria_precos_admin_stark_manage ON public.concessionaria_precos;
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

-- Policy 2: Admin Concessionária gerencia SEUS PRÓPRIOS preços
DROP POLICY IF EXISTS concessionaria_precos_admin_concessionaria_manage ON public.concessionaria_precos;
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

-- Policy 3: Vendedores da concessionária podem LER seus preços
DROP POLICY IF EXISTS concessionaria_precos_vendedor_read ON public.concessionaria_precos;
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

-- Verificar se a tabela foi criada corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'concessionaria_precos'
  ) THEN
    RAISE NOTICE '✅ Tabela concessionaria_precos criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela concessionaria_precos não foi criada!';
  END IF;
END $$;
