-- Apply after schema.sql, in a test database first. Not deployed by this change.
begin;
alter table garage_commerce.orders add column items text[] not null default '{}',add column payment_received boolean not null default false,add column refunded boolean not null default false,add column disputed boolean not null default false,add column dispute_clock bigint not null default 0;
create table garage_commerce.testers(user_id uuid primary key references auth.users on delete cascade);
alter table garage_commerce.testers enable row level security;
revoke all on garage_commerce.testers from public,anon,authenticated;
create function garage_commerce.api(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p garage_commerce.products;o garage_commerce.orders;ids text[];result jsonb;
begin
 if not acc_private.verified() then raise exception 'Active Garage account required';end if;
 if not acc_private.is_owner() and not exists(select 1 from garage_commerce.testers where user_id=u) then raise exception 'Private commerce testing only';end if;
 if op='snapshot' then
  return jsonb_build_object('owner',acc_private.is_owner(),'testMode',true,'products',coalesce((select jsonb_agg(to_jsonb(x)) from(select catalog_row.id,catalog_row.name,catalog_row.kind,catalog_row.price_cents,catalog_row.currency,catalog_row.active,array(select item from garage_commerce.bundle_items where product=catalog_row.id) items from garage_commerce.products catalog_row order by catalog_row.id)x),'[]'::jsonb),'owned',coalesce((select jsonb_agg(distinct item) from garage_commerce.grants where user_id=u and not revoked),'[]'::jsonb),'equipment',coalesce((select jsonb_object_agg(slot,item) from garage_commerce.equipment e where user_id=u and exists(select 1 from garage_commerce.grants g where g.user_id=u and g.item=e.item and not g.revoked)),'{}'::jsonb),'purchases',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,product,amount_cents,currency,status,created_at from garage_commerce.orders where user_id=u order by created_at desc limit 50)x),'[]'::jsonb));
 elsif op='appearances' then
  if jsonb_typeof(b->'users') is distinct from 'array' or jsonb_array_length(b->'users')>50 then raise exception 'At most 50 profile IDs';end if;
  return coalesce((select jsonb_object_agg(person,looks) from(select e.user_id person,jsonb_object_agg(e.slot,e.item) looks from garage_commerce.equipment e where e.user_id::text in(select jsonb_array_elements_text(b->'users')) and exists(select 1 from garage_commerce.grants g where g.user_id=e.user_id and g.item=e.item and not g.revoked) group by e.user_id)x),'{}'::jsonb);
 elsif op='equip' then
  if b->>'item' is null then delete from garage_commerce.equipment where user_id=u and slot=b->>'slot';return '{}'::jsonb;end if;
  select * into strict p from garage_commerce.products where id=b->>'item';
  if p.kind='bundle' or p.kind<>b->>'slot' or not exists(select 1 from garage_commerce.grants where user_id=u and item=p.id and not revoked) then raise exception 'Owned cosmetic required';end if;
  insert into garage_commerce.equipment values(u,p.kind,p.id) on conflict(user_id,slot) do update set item=excluded.item;return '{}'::jsonb;
 elsif op='reserve' then
  perform pg_advisory_xact_lock(hashtextextended('commerce:'||u::text,0));
  select * into strict p from garage_commerce.products where id=b->>'product' and active and stripe_price_id is not null;
  select array_agg(item) into ids from(select p.id item where p.kind<>'bundle' union select item from garage_commerce.bundle_items where product=p.id)x;
  if coalesce(cardinality(ids),0)=0 then raise exception 'Empty product';end if;
  -- Block even partial bundle overlap so students do not pay for duplicate items.
  if exists(select 1 from garage_commerce.grants where user_id=u and item=any(ids) and not revoked) then raise exception 'You already own an item in this product';end if;
  select * into o from garage_commerce.orders where user_id=u and product=p.id and status='pending';
  if not found then
   if (select count(*) from garage_commerce.orders where user_id=u and created_at>now()-interval '1 hour')>=5 then raise exception 'Please wait before starting another checkout';end if;
   insert into garage_commerce.orders(user_id,product,amount_cents,currency,items) values(u,p.id,p.price_cents,p.currency,ids) returning * into o;
  end if;
  -- Freeze the price used for retries; reject catalog edits while an order is pending.
  if o.amount_cents<>p.price_cents then raise exception 'Pending checkout price changed; contact support';end if;
  return jsonb_build_object('order',to_jsonb(o),'product',to_jsonb(p));
 elsif op='catalogUpdate' then
  if not acc_private.is_owner() then raise exception 'Owner only';end if;
  if b->>'id' !~ '^[a-z0-9-]{1,64}$' or length(b->>'name') not between 1 and 80 or b->>'stripe_price_id' !~ '^price_[a-zA-Z0-9]+$' then raise exception 'Invalid catalog entry';end if;
  if exists(select 1 from garage_commerce.orders where product=b->>'id' and status='pending') then raise exception 'Product has pending checkouts';end if;
  insert into garage_commerce.products(id,name,kind,price_cents,stripe_price_id,active) values(b->>'id',b->>'name',b->>'kind',(b->>'price_cents')::integer,b->>'stripe_price_id',coalesce((b->>'active')::boolean,false)) on conflict(id) do update set name=excluded.name,price_cents=excluded.price_cents,stripe_price_id=excluded.stripe_price_id,active=excluded.active,revision=garage_commerce.products.revision+1;
  return '{}'::jsonb;
 else raise exception 'Unknown commerce operation';end if;
end $$;
revoke all on function garage_commerce.api(text,jsonb) from public;
grant usage on schema garage_commerce to authenticated;
grant execute on function garage_commerce.api(text,jsonb) to authenticated;
create function public.garage_shop(op text,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select garage_commerce.api(op,b)$$;
revoke all on function public.garage_shop(text,jsonb) from public,anon;
grant execute on function public.garage_shop(text,jsonb) to authenticated;

-- Only the signature-verifying Edge Function service role can call this transaction.
create function garage_commerce.payment(op text,b jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o garage_commerce.orders;order_key uuid;e jsonb:=b;s jsonb;typ text;pid text;oid uuid;
begin
 if op='bind' then
  select * into strict o from garage_commerce.orders where id=(b->>'order')::uuid for update;
  if b->>'session' !~ '^cs_test_' or (o.session_id is not null and o.session_id<>b->>'session') then raise exception 'Invalid session binding';end if;
  update garage_commerce.orders set session_id=b->>'session' where id=o.id;return '{}'::jsonb;
 end if;
 if op<>'event' or (e->>'livemode') is distinct from 'false' or e->>'id' !~ '^evt_' then raise exception 'Test event required';end if;
 typ:=e->>'type';s:=e#>'{data,object}';
 if typ not in('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','charge.refunded','charge.dispute.created','charge.dispute.closed') then return '{"ignored":true}'::jsonb;end if;
 if typ like 'checkout.%' then
  select * into o from garage_commerce.orders where session_id=s->>'id' for update;
  if not found then raise exception 'Session binding not ready';end if;
 else
  pid:=s->>'payment_intent';
  select * into o from garage_commerce.orders where payment_intent=pid for update;
  if not found then raise exception 'Payment binding not ready';end if;
 end if;
 insert into garage_commerce.events(id,event_type) values(e->>'id',typ) on conflict do nothing;
 if not found then return '{"duplicate":true}'::jsonb;end if;
 if typ in('checkout.session.completed','checkout.session.async_payment_succeeded') then
  if (s->>'mode') is distinct from 'payment' or (s->>'payment_status') is distinct from 'paid' then return '{"pending":true}'::jsonb;end if;
  if (s->>'livemode') is distinct from 'false' or (s#>>'{metadata,order_id}') is distinct from o.id::text or (s->>'client_reference_id') is distinct from o.user_id::text or (s->>'amount_total')::integer is distinct from o.amount_cents or (s->>'currency') is distinct from o.currency or s->>'payment_intent' is null then raise exception 'Payment mismatch';end if;
  update garage_commerce.orders set payment_received=true,payment_intent=s->>'payment_intent' where id=o.id;
 elsif typ='charge.refunded' then
  if (s->>'amount_refunded')::integer>0 then update garage_commerce.orders set refunded=true where id=o.id;end if;
 elsif typ like 'charge.dispute.%' then
  if (e->>'created')::bigint>=o.dispute_clock then update garage_commerce.orders set disputed=typ='charge.dispute.created' or s->>'status'<>'won',dispute_clock=(e->>'created')::bigint where id=o.id;end if;
 elsif not o.payment_received then update garage_commerce.orders set status='failed' where id=o.id;
 end if;
 order_key:=o.id;
 select * into o from garage_commerce.orders where id=order_key;
 if o.payment_received then insert into garage_commerce.grants(order_id,item,user_id) select o.id,unnest(o.items),o.user_id on conflict do nothing;end if;
 update garage_commerce.grants set revoked=o.refunded or o.disputed where order_id=o.id;
 update garage_commerce.orders set status=case when o.refunded then 'refunded' when o.disputed then 'disputed' when o.payment_received then 'paid' else status end where id=o.id;
 delete from garage_commerce.equipment x where x.user_id=o.user_id and not exists(select 1 from garage_commerce.grants g where g.user_id=x.user_id and g.item=x.item and not g.revoked);
 return '{"processed":true}'::jsonb;
end $$;
revoke all on function garage_commerce.payment(text,jsonb) from public,anon,authenticated;
grant usage on schema garage_commerce to service_role;
grant execute on function garage_commerce.payment(text,jsonb) to service_role;
create function public.garage_payment(op text,b jsonb) returns jsonb language sql security invoker set search_path='' as $$select garage_commerce.payment(op,b)$$;
revoke all on function public.garage_payment(text,jsonb) from public,anon,authenticated;
grant execute on function public.garage_payment(text,jsonb) to service_role;
commit;
