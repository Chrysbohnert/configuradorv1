ALTER TABLE public.precificacao
  ADD COLUMN IF NOT EXISTS ipi_percent NUMERIC(10, 4);

ALTER TABLE public.precificacao_condicoes
  ADD COLUMN IF NOT EXISTS taxa_anual_percent NUMERIC(10, 6) NOT NULL DEFAULT 0 CHECK (taxa_anual_percent >= 0);

INSERT INTO public.configuracoes_globais (chave, valor_numero)
VALUES
  ('precificacao_passo_desconto_parcela', 1),
  ('precificacao_irpj', 25),
  ('precificacao_csll', 9),
  ('precificacao_ipi_padrao', 0)
ON CONFLICT (chave) DO NOTHING;
