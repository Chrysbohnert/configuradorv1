create table if not exists public.precos_compra_concessionaria_por_regiao (
  guindaste_id bigint not null references public.guindastes(id) on delete cascade,
  regiao text not null,
  preco numeric not null check (preco >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guindaste_id, regiao)
);

drop trigger if exists precos_compra_concessionaria_por_regiao_set_updated_at on public.precos_compra_concessionaria_por_regiao;
create trigger precos_compra_concessionaria_por_regiao_set_updated_at
before update on public.precos_compra_concessionaria_por_regiao
for each row execute function public.set_updated_at();

alter table public.precos_compra_concessionaria_por_regiao enable row level security;

drop policy if exists precos_compra_concessionaria_por_regiao_read on public.precos_compra_concessionaria_por_regiao;
create policy precos_compra_concessionaria_por_regiao_read on public.precos_compra_concessionaria_por_regiao
for select using (true);

drop policy if exists precos_compra_concessionaria_por_regiao_admin_manage on public.precos_compra_concessionaria_por_regiao;
create policy precos_compra_concessionaria_por_regiao_admin_manage on public.precos_compra_concessionaria_por_regiao
for all
using (
  exists (
    select 1 from public.users u
    where u.email = auth.email()
      and u.tipo = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.email = auth.email()
      and u.tipo = 'admin'
  )
);
