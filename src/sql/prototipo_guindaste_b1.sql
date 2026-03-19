create table if not exists public.prototype_payment_plan_sets (
  id uuid primary key default gen_random_uuid(),
  guindaste_id int4 not null references public.guindastes(id) on delete cascade,
  status text not null check (status in ('draft','published','archived')),
  version integer not null default 1,
  created_by uuid null,
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null
);

create unique index if not exists prototype_payment_plan_sets_unique_published
  on public.prototype_payment_plan_sets(guindaste_id)
  where status = 'published';

create index if not exists prototype_payment_plan_sets_lookup
  on public.prototype_payment_plan_sets(guindaste_id, status, version);

create table if not exists public.prototype_payment_plan_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.prototype_payment_plan_sets(id) on delete cascade,
  audience text not null check (audience in ('revenda','cliente')),
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

create unique index if not exists prototype_payment_plan_items_unique_desc
  on public.prototype_payment_plan_items(set_id, audience, description, entry_percent_required);

drop trigger if exists prototype_payment_plan_items_set_updated_at on public.prototype_payment_plan_items;
create trigger prototype_payment_plan_items_set_updated_at
before update on public.prototype_payment_plan_items
for each row execute function public.set_updated_at();

create or replace view public.prototype_payment_plans_published as
select
  i.*,
  s.guindaste_id,
  s.version as set_version,
  s.published_at
from public.prototype_payment_plan_items i
join public.prototype_payment_plan_sets s on s.id = i.set_id
where s.status = 'published';

create or replace function public.ensure_prototype_payment_plan_draft_set(p_guindaste_id int4)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_next_version integer;
begin
  select id into v_id
  from public.prototype_payment_plan_sets
  where guindaste_id = p_guindaste_id
    and status = 'draft'
  order by created_at desc
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.prototype_payment_plan_sets
  where guindaste_id = p_guindaste_id;

  insert into public.prototype_payment_plan_sets(guindaste_id, status, version, created_by)
  values (p_guindaste_id, 'draft', v_next_version, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.publish_prototype_payment_plan_set(p_set_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_guindaste_id int4;
  v_existing_published uuid;
begin
  select guindaste_id into v_guindaste_id
  from public.prototype_payment_plan_sets
  where id = p_set_id
    and status = 'draft'
  for update;

  if v_guindaste_id is null then
    raise exception 'Conjunto de protótipo inválido ou não está em rascunho';
  end if;

  select id into v_existing_published
  from public.prototype_payment_plan_sets
  where guindaste_id = v_guindaste_id
    and status = 'published'
  for update;

  if v_existing_published is not null then
    update public.prototype_payment_plan_sets
      set status = 'archived', archived_at = now()
    where id = v_existing_published;
  end if;

  update public.prototype_payment_plan_sets
    set status = 'published', published_at = now()
  where id = p_set_id;

  update public.guindastes
    set prototipo_payment_set_id = p_set_id
  where id = v_guindaste_id;
end;
$$;

alter table public.guindastes
add column if not exists is_prototipo boolean not null default false,
add column if not exists prototipo_label text null,
add column if not exists prototipo_observacoes_pdf text null,
add column if not exists prototipo_payment_set_id uuid null;

create index if not exists idx_guindastes_is_prototipo on public.guindastes(is_prototipo);

alter table public.prototype_payment_plan_sets enable row level security;
alter table public.prototype_payment_plan_items enable row level security;

drop policy if exists prototype_payment_plan_sets_read_published on public.prototype_payment_plan_sets;
create policy prototype_payment_plan_sets_read_published on public.prototype_payment_plan_sets
  for select
  using (status = 'published');

drop policy if exists prototype_payment_plan_items_read_published on public.prototype_payment_plan_items;
create policy prototype_payment_plan_items_read_published on public.prototype_payment_plan_items
  for select
  using (exists (select 1 from public.prototype_payment_plan_sets s where s.id = set_id and s.status = 'published'));

drop policy if exists prototype_payment_plan_sets_admin_manage on public.prototype_payment_plan_sets;
create policy prototype_payment_plan_sets_admin_manage on public.prototype_payment_plan_sets
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

drop policy if exists prototype_payment_plan_items_admin_manage on public.prototype_payment_plan_items;
create policy prototype_payment_plan_items_admin_manage on public.prototype_payment_plan_items
  for all
  using (
    exists (
      select 1
      from public.prototype_payment_plan_sets s
      join public.users u on u.email = auth.email()
      where s.id = set_id
        and u.tipo = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.prototype_payment_plan_sets s
      join public.users u on u.email = auth.email()
      where s.id = set_id
        and u.tipo = 'admin'
    )
  );
