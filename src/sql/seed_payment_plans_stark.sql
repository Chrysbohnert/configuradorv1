do $$
declare
  v_set_id uuid;
  v_version integer;
begin
  drop index if exists public.payment_plan_items_unique_order;
  create unique index if not exists payment_plan_items_unique_order_desc
    on public.payment_plan_items(set_id, audience, "order", description);

  drop index if exists public.payment_plan_items_unique_desc;
  create unique index if not exists payment_plan_items_unique_desc
    on public.payment_plan_items(set_id, audience, description, entry_percent_required);

  select coalesce(max(version), 0) + 1 into v_version
  from public.payment_plan_sets
  where scope = 'stark' and concessionaria_id is null;

  insert into public.payment_plan_sets(scope, concessionaria_id, status, version, created_by)
  values ('stark', null, 'draft', v_version, null)
  returning id into v_set_id;

  insert into public.payment_plan_items(
    set_id, audience, "order", description, installments, active, nature,
    discount_percent, surcharge_percent, entry_percent_required
  ) values
    (v_set_id, 'revenda', 0, 'À Vista', 1, true, 'Venda', 0.03, null, null),
    (v_set_id, 'revenda', 1, '7 DD', 1, true, 'Venda', 0.03, null, null),
    (v_set_id, 'revenda', 1, '15 DD', 1, true, 'Venda', 0.03, null, null),
    (v_set_id, 'revenda', 2, '30 DD', 1, true, 'Venda', 0.03, null, null),
    (v_set_id, 'revenda', 2, '45 DD', 1, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 3, '15/30 DD', 2, true, 'Venda', 0.03, null, null),
    (v_set_id, 'revenda', 3, '30/45 DD', 2, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 3, '30/60 DD', 2, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 3, '45/60 DD', 2, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 4, '15/30/45 DD', 3, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 4, '30/45/60 DD', 3, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 4, '30/60/90 DD', 3, true, 'Venda', 0.00, null, null),
    (v_set_id, 'revenda', 4, '45/60/75 DD', 3, true, 'Venda', 0.00, null, null),
    (v_set_id, 'revenda', 5, '15/30/45/60 DD', 4, true, 'Venda', 0.01, null, null),
    (v_set_id, 'revenda', 5, '4x - 30/60/90/120 DD', 4, true, 'Venda', null, 0.00, null),
    (v_set_id, 'revenda', 5, '30/45/60/75/90/105/120 DD', 7, true, 'Venda', null, 0.00, null),

    (v_set_id, 'cliente', 1, '7 DD', 1, true, 'Venda', 0.03, null, null),
    (v_set_id, 'cliente', 1, '15 DD', 1, true, 'Venda', 0.03, null, null),
    (v_set_id, 'cliente', 2, '30 DD', 1, true, 'Venda', null, 0.03, null),

    (v_set_id, 'cliente', 49, 'À Vista', 1, true, 'Venda', 0.00, 0.00, 0.50),
    (v_set_id, 'cliente', 50, '7 DD', 1, true, 'Venda', 0.03, 0.00, 0.50),
    (v_set_id, 'cliente', 51, '15 DD', 1, true, 'Venda', 0.03, 0.00, 0.50),
    (v_set_id, 'cliente', 52, '30 DD', 1, true, 'Venda', 0.03, 0.00, 0.50),
    (v_set_id, 'cliente', 53, '45 DD', 1, true, 'Venda', 0.01, 0.00, 0.50),
    (v_set_id, 'cliente', 54, '15/30 DD', 2, true, 'Venda', 0.03, 0.00, 0.50),
    (v_set_id, 'cliente', 55, '30/45 DD', 2, true, 'Venda', 0.01, 0.00, 0.50),
    (v_set_id, 'cliente', 56, '30/60 DD', 2, true, 'Venda', 0.01, 0.00, 0.50),
    (v_set_id, 'cliente', 57, '45/60 DD', 2, true, 'Venda', 0.01, 0.00, 0.50),
    (v_set_id, 'cliente', 58, '15/30/45 DD', 3, true, 'Venda', 0.01, 0.00, 0.50),
    (v_set_id, 'cliente', 59, '30/45/60 DD', 3, true, 'Venda', 0.01, 0.00, 0.50),
    (v_set_id, 'cliente', 60, '15/30/45/60 DD', 4, true, 'Venda', 0.01, 0.00, 0.50),

    (v_set_id, 'cliente', 11, '15/30/45 DD', 3, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 13, '30/45/60 DD', 3, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 23, '30/60 DD', 2, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 10, '30/60/90 DD', 3, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 15, '45/60/75 DD', 3, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 14, '15/30/45/60 DD', 4, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 12, '30/60/90/120 DD', 4, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 17, '45/60/75/90 DD', 4, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 18, '30/45/60/75/90 DD', 5, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 19, '15/30/45/60/75/90 DD', 6, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 20, '30/60/90/120/150/180 DD', 6, true, 'Venda', 0.00, 0.04, 0.30),
    (v_set_id, 'cliente', 16, '30/45/60/75/90/105/120 DD', 7, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 21, '15/30/45/60/75/90/105/120 DD', 8, true, 'Venda', 0.00, 0.00, 0.30),
    (v_set_id, 'cliente', 22, '15/30/45/60/75/90/105/120/135/150 DD', 10, true, 'Venda', 0.00, 0.04, 0.30);

  perform public.publish_payment_plan_set(v_set_id);
end $$;
