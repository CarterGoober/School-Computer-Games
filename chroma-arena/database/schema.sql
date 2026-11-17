-- New isolated game-only schema. No Chat, Supabase Auth or paid-commerce changes.
begin;
create schema if not exists chroma_private;
revoke all on schema chroma_private from public,anon,authenticated;
create table if not exists chroma_private.accounts(
 id text primary key check(length(id) between 1 and 100),
 data jsonb not null check(jsonb_typeof(data)='object' and data->>'id'=id),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 check(jsonb_typeof(data->'guest')='boolean'),
 check(jsonb_typeof(data->'owned')='array'),
 check(jsonb_typeof(data->'loadout')='object'),
 check(jsonb_typeof(data->'stats')='object'),
 check((data->>'xp')::bigint>=0 and (data->>'stardust')::bigint>=0)
);
create unique index if not exists chroma_username on chroma_private.accounts((data->>'usernameKey')) where data->>'usernameKey' is not null;
alter table chroma_private.accounts enable row level security;
revoke all on chroma_private.accounts from public,anon,authenticated;
commit;
-- Runtime uses a server-only Postgres connection; clients have no table policies.
