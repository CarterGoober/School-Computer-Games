-- REVIEW CANDIDATE ONLY: not applied. Test commerce remains separate from live ownership.
begin;
create schema if not exists garage_commerce;
revoke all on schema garage_commerce from public,anon,authenticated;
create table garage_commerce.products(id text primary key,name text not null,kind text not null check(kind in('avatar','frame','effect','theme','bundle')),price_cents integer not null check(price_cents between 49 and 399),currency text not null default 'usd' check(currency='usd'),stripe_price_id text,active boolean not null default false,revision integer not null default 1);
create table garage_commerce.bundle_items(product text references garage_commerce.products on delete cascade,item text references garage_commerce.products,primary key(product,item),check(product<>item));
create table garage_commerce.orders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,product text not null references garage_commerce.products,amount_cents integer not null,currency text not null default 'usd',session_id text unique,payment_intent text unique,status text not null default 'pending' check(status in('pending','paid','failed','refunded','disputed')),test_mode boolean not null default true check(test_mode),created_at timestamptz not null default now());
create unique index one_pending_product on garage_commerce.orders(user_id,product) where status='pending';
create table garage_commerce.events(id text primary key,event_type text not null,processed_at timestamptz not null default now());
create table garage_commerce.grants(order_id uuid references garage_commerce.orders on delete cascade,item text references garage_commerce.products,user_id uuid not null references auth.users on delete cascade,revoked boolean not null default false,primary key(order_id,item));
create table garage_commerce.equipment(user_id uuid references auth.users on delete cascade,slot text check(slot in('avatar','frame','effect','theme')),item text references garage_commerce.products,primary key(user_id,slot));
-- Reserved architecture only: there is no public API that activates a plan.
create table garage_commerce.plans(id text primary key,monthly_cents integer not null,active boolean not null default false,daily_questions integer not null,daily_screens integer not null);
insert into garage_commerce.plans values('garage-ai-plus',299,false,90,15);
create table garage_commerce.entitlements(user_id uuid references auth.users on delete cascade,plan text references garage_commerce.plans,expires_at timestamptz not null,stripe_subscription text unique,primary key(user_id,plan));
do $$ declare t text;begin foreach t in array array['products','bundle_items','orders','events','grants','equipment','plans','entitlements'] loop execute format('alter table garage_commerce.%I enable row level security',t);execute format('revoke all on garage_commerce.%I from public,anon,authenticated',t);end loop;end $$;
commit;
