-- Adiciona controle de conversão de proposta em venda
-- Execute no Supabase (SQL Editor)

alter table public.propostas
  add column if not exists resultado_venda text;

alter table public.propostas
  add column if not exists motivo_perda text;

alter table public.propostas
  add column if not exists data_resultado_venda timestamptz;

-- Restrições (opcional, mas recomendado)
alter table public.propostas
  drop constraint if exists propostas_resultado_venda_check;

alter table public.propostas
  add constraint propostas_resultado_venda_check
  check (resultado_venda is null or resultado_venda in ('efetivada', 'perdida'));

-- Performance para dashboards/filtros
create index if not exists idx_propostas_resultado_venda on public.propostas (resultado_venda);
create index if not exists idx_propostas_data_resultado_venda on public.propostas (data_resultado_venda);
