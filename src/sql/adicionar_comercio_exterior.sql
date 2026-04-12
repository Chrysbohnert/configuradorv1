-- ============================================================
-- Migração: Adicionar audiência 'comercio_exterior'
-- Execute no painel SQL do Supabase (ou via psql)
-- ============================================================

-- 1) Remover o CHECK existente na coluna audience
ALTER TABLE public.payment_plan_items
  DROP CONSTRAINT IF EXISTS payment_plan_items_audience_check;

-- 2) Adicionar novo CHECK incluindo 'comercio_exterior'
ALTER TABLE public.payment_plan_items
  ADD CONSTRAINT payment_plan_items_audience_check
  CHECK (audience IN ('revenda', 'cliente', 'concessionaria_compra', 'comercio_exterior'));

-- 3) (Opcional) Inserir planos padrão de Comércio Exterior no conjunto Stark publicado
--    Só execute este bloco SE quiser pré-popular os planos no banco.
--    Se preferir cadastrar pela UI de Planos de Pagamento, pule este bloco.
--
-- DO $$
-- DECLARE
--   v_set_id uuid;
-- BEGIN
--   -- Buscar o set Stark publicado
--   SELECT id INTO v_set_id
--     FROM public.payment_plan_sets
--    WHERE scope = 'stark'
--      AND concessionaria_id IS NULL
--      AND status = 'published'
--    ORDER BY published_at DESC
--    LIMIT 1;
--
--   IF v_set_id IS NULL THEN
--     RAISE NOTICE 'Nenhum conjunto Stark publicado encontrado. Cadastre os planos pela UI.';
--     RETURN;
--   END IF;
--
--   -- Plano 1: À Vista (100%)
--   INSERT INTO public.payment_plan_items
--     (set_id, audience, "order", description, installments, active, nature,
--      discount_percent, surcharge_percent, entry_percent_required)
--   VALUES
--     (v_set_id, 'comercio_exterior', 1, 'À Vista (100%)', 1, true, 'Venda',
--      0, 0, NULL)
--   ON CONFLICT ON CONSTRAINT payment_plan_items_unique_desc DO NOTHING;
--
--   -- Plano 2: 50% Entrada + 50% Pós Faturamento
--   INSERT INTO public.payment_plan_items
--     (set_id, audience, "order", description, installments, active, nature,
--      discount_percent, surcharge_percent, entry_percent_required)
--   VALUES
--     (v_set_id, 'comercio_exterior', 2, 'Pós Faturamento', 1, true, 'Venda',
--      0, 0, 0.50)
--   ON CONFLICT ON CONSTRAINT payment_plan_items_unique_desc DO NOTHING;
--
--   RAISE NOTICE 'Planos de Comércio Exterior inseridos no set %', v_set_id;
-- END $$;
