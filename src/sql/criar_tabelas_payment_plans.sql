create table if not exists public.payment_plan_sets (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('stark','concessionaria')),
  concessionaria_id uuid null references public.concessionarias(id) on delete cascade,
  status text not null check (status in ('draft','published','archived')),
  version integer not null default 1,
  created_by uuid null,
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,
  constraint payment_plan_sets_concessionaria_scope_chk check (
    (scope = 'stark' and concessionaria_id is null) or
    (scope = 'concessionaria' and concessionaria_id is not null)
  )
);

create unique index if not exists payment_plan_sets_unique_published
  on public.payment_plan_sets(scope, concessionaria_id)
  where status = 'published';

create index if not exists payment_plan_sets_lookup
  on public.payment_plan_sets(scope, concessionaria_id, status, version);

create table if not exists public.payment_plan_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.payment_plan_sets(id) on delete cascade,
  audience text not null check (audience in ('revenda','cliente','concessionaria_compra')),
  "order" integer not null,
  description text not null,
  installments integer not null check (installments >= 1),
  active boolean not null default true,
  nature text null,
  discount_percent numeric null check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 0.30)),
  surcharge_percent numeric null check (surcharge_percent is null or (surcharge_percent >= 0 and surcharge_percent <= 0.30)),
  min_order_value numeric null check (min_order_value is null or min_order_value >= 0),
  entry_percent_required numeric null check (entry_percent_required is null or entry_percent_required in (0.30, 0.50)),
  entry_percent numeric null check (entry_percent is null or (entry_percent >= 0 and entry_percent <= 1)),
  entry_min numeric null check (entry_min is null or entry_min >= 0),
  juros_mensal numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.payment_plan_items_unique_order;

create unique index if not exists payment_plan_items_unique_order_desc
  on public.payment_plan_items(set_id, audience, "order", description);

drop index if exists public.payment_plan_items_unique_desc;

create unique index if not exists payment_plan_items_unique_desc
  on public.payment_plan_items(set_id, audience, description, entry_percent_required);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_plan_items_set_updated_at on public.payment_plan_items;
create trigger payment_plan_items_set_updated_at
before update on public.payment_plan_items
for each row execute function public.set_updated_at();

create or replace view public.payment_plans_published as
select
  i.*,
  s.scope,
  s.concessionaria_id,
  s.version as set_version,
  s.published_at
from public.payment_plan_items i
join public.payment_plan_sets s on s.id = i.set_id
where s.status = 'published';

create or replace function public.ensure_payment_plan_draft_set(p_scope text, p_concessionaria_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_next_version integer;
begin
  select id into v_id
  from public.payment_plan_sets
  where scope = p_scope
    and ((p_concessionaria_id is null and concessionaria_id is null) or concessionaria_id = p_concessionaria_id)
    and status = 'draft'
  order by created_at desc
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.payment_plan_sets
  where scope = p_scope
    and ((p_concessionaria_id is null and concessionaria_id is null) or concessionaria_id = p_concessionaria_id);

  insert into public.payment_plan_sets(scope, concessionaria_id, status, version, created_by)
  values (p_scope, p_concessionaria_id, 'draft', v_next_version, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.publish_payment_plan_set(p_set_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_scope text;
  v_concessionaria_id uuid;
  v_existing_published uuid;
begin
  select scope, concessionaria_id into v_scope, v_concessionaria_id
  from public.payment_plan_sets
  where id = p_set_id
    and status = 'draft'
  for update;

  if v_scope is null then
    raise exception 'Conjunto de planos inválido ou não está em rascunho';
  end if;

  select id into v_existing_published
  from public.payment_plan_sets
  where scope = v_scope
    and ((v_concessionaria_id is null and concessionaria_id is null) or concessionaria_id = v_concessionaria_id)
    and status = 'published'
  for update;

  if v_existing_published is not null then
    update public.payment_plan_sets
      set status = 'archived', archived_at = now()
    where id = v_existing_published;
  end if;

  update public.payment_plan_sets
    set status = 'published', published_at = now()
  where id = p_set_id;
end;
$$;

create or replace function public.rollback_payment_plan_set(p_archived_set_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_scope text;
  v_concessionaria_id uuid;
  v_existing_published uuid;
begin
  select scope, concessionaria_id into v_scope, v_concessionaria_id
  from public.payment_plan_sets
  where id = p_archived_set_id
    and status = 'archived'
  for update;

  if v_scope is null then
    raise exception 'Conjunto arquivado inválido';
  end if;

  select id into v_existing_published
  from public.payment_plan_sets
  where scope = v_scope
    and ((v_concessionaria_id is null and concessionaria_id is null) or concessionaria_id = v_concessionaria_id)
    and status = 'published'
  for update;

  if v_existing_published is not null then
    update public.payment_plan_sets
      set status = 'archived', archived_at = now()
    where id = v_existing_published;
  end if;

  update public.payment_plan_sets
    set status = 'published', published_at = now()
  where id = p_archived_set_id;
end;
$$;

alter table public.payment_plan_sets enable row level security;
alter table public.payment_plan_items enable row level security;

drop policy if exists payment_plan_sets_read_published on public.payment_plan_sets;
create policy payment_plan_sets_read_published on public.payment_plan_sets
  for select
  using (status = 'published');

drop policy if exists payment_plan_items_read_published on public.payment_plan_items;
create policy payment_plan_items_read_published on public.payment_plan_items
  for select
  using (exists (select 1 from public.payment_plan_sets s where s.id = set_id and s.status = 'published'));

drop policy if exists payment_plan_sets_admin_manage on public.payment_plan_sets;
create policy payment_plan_sets_admin_manage on public.payment_plan_sets
  for all
  using (
    exists (
      select 1 from public.users u
      where u.email = auth.email()
        and (
          u.tipo = 'admin'
          or (u.tipo = 'admin_concessionaria' and concessionaria_id = u.concessionaria_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.email = auth.email()
        and (
          (u.tipo = 'admin' and scope = 'stark' and concessionaria_id is null)
          or (u.tipo = 'admin_concessionaria' and scope = 'concessionaria' and concessionaria_id = u.concessionaria_id)
        )
    )
  );

drop policy if exists payment_plan_items_admin_manage on public.payment_plan_items;
create policy payment_plan_items_admin_manage on public.payment_plan_items
  for all
  using (
    exists (
      select 1
      from public.payment_plan_sets s
      join public.users u on u.email = auth.email()
      where s.id = set_id
        and (
          u.tipo = 'admin'
          or (u.tipo = 'admin_concessionaria' and s.concessionaria_id = u.concessionaria_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.payment_plan_sets s
      join public.users u on u.email = auth.email()
      where s.id = set_id
        and (
          (u.tipo = 'admin' and s.scope = 'stark' and s.concessionaria_id is null)
          or (u.tipo = 'admin_concessionaria' and s.scope = 'concessionaria' and s.concessionaria_id = u.concessionaria_id)
        )
    )
  );
