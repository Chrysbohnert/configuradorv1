drop index if exists public.payment_plan_items_unique_order;

create unique index if not exists payment_plan_items_unique_order_desc
  on public.payment_plan_items(set_id, audience, "order", description);

drop index if exists public.payment_plan_items_unique_desc;

create unique index if not exists payment_plan_items_unique_desc
  on public.payment_plan_items(set_id, audience, description, entry_percent_required);
