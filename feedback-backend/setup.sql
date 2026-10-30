-- Repeatable setup; preserves submissions. Run as database owner in Supabase SQL editor.
begin;
create schema if not exists garage_private;
revoke all on schema garage_private from public;
-- USAGE permits the invoker wrappers below; do not expose this schema in Data API settings.
grant usage on schema garage_private to anon, authenticated;
create table if not exists public.garage_feedback (
 id uuid primary key, client_id uuid not null,
 username text not null check (char_length(btrim(username)) between 2 and 24 and username !~ '[[:cntrl:]]'),
 game text not null, kind text not null check (kind in ('review','bug','idea')),
 rating integer check (rating between 1 and 5),
 title text not null check (char_length(btrim(title)) between 1 and 90 and title !~ '[[:cntrl:]]'),
 message text not null check (char_length(btrim(message)) between 10 and 1200),
 created_at timestamptz not null default now(), visible boolean not null default true,
 check (kind <> 'review' or rating is not null)
);
alter table public.garage_feedback drop constraint if exists garage_feedback_game_check;
alter table public.garage_feedback add constraint garage_feedback_game_check check (game in ('hub','apex','drift','tide','basketball'));
alter table public.garage_feedback enable row level security;
revoke all on public.garage_feedback from public, anon, authenticated;
create index if not exists garage_feedback_public_recent on public.garage_feedback(game,created_at desc,id desc) where visible;
create index if not exists garage_feedback_client_recent on public.garage_feedback(client_id,created_at desc);

-- Intentionally anonymous, validated API. Privileged implementation stays out of exposed schemas.
-- No auth.uid() check: this API explicitly supports players without accounts.
create or replace function garage_private.submit_feedback(p_id uuid,p_client_id uuid,p_username text,p_game text,p_kind text,p_rating integer,p_title text,p_message text,p_website text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.garage_feedback; result public.garage_feedback;
begin
 if p_id is null or p_client_id is null or coalesce(p_website,'')<>'' then
  raise exception 'Please reload the form and try again.';
 end if;
 -- Serialize both retries and submissions by this browser, including concurrent requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_client_id::text,0));
 select * into existing from public.garage_feedback where id=p_id;
 if found then
  if existing.client_id<>p_client_id then raise exception 'Please start a new feedback draft.'; end if;
  return jsonb_build_object('id',existing.id,'created_at',existing.created_at);
 end if;
 if p_username is null or char_length(btrim(p_username)) not between 2 and 24 or p_username ~ '[[:cntrl:]]'
 or p_title is null or char_length(btrim(p_title)) not between 1 and 90 or p_title ~ '[[:cntrl:]]'
 or p_message is null or char_length(btrim(p_message)) not between 10 and 1200
 or p_game is null or p_game not in ('hub','apex','drift','tide','basketball')
 or p_kind is null or p_kind not in ('review','bug','idea')
 or (p_kind='review' and p_rating is null) or (p_rating is not null and p_rating not between 1 and 5)
 then raise exception 'Check your username, rating, and feedback details.'; end if;
 if exists(select 1 from public.garage_feedback where client_id=p_client_id and created_at>now()-interval '1 minute')
 then raise exception 'Wait one minute before posting again.'; end if;
 if (select count(*) from public.garage_feedback where client_id=p_client_id and created_at>now()-interval '24 hours')>=5
 then raise exception 'You have posted 5 times today. Come back tomorrow.'; end if;
 insert into public.garage_feedback(id,client_id,username,game,kind,rating,title,message)
 values(p_id,p_client_id,btrim(p_username),p_game,p_kind,case when p_kind='review' then p_rating else null end,btrim(p_title),btrim(p_message)) returning * into result;
 return jsonb_build_object('id',result.id,'created_at',result.created_at);
end; $$;
create or replace function public.submit_garage_feedback(p_id uuid,p_client_id uuid,p_username text,p_game text,p_kind text,p_rating integer,p_title text,p_message text,p_website text default '')
returns jsonb language sql security invoker set search_path = '' as $$
 select garage_private.submit_feedback(p_id,p_client_id,p_username,p_game,p_kind,p_rating,p_title,p_message,p_website);
$$;
create or replace function garage_private.list_feedback(p_game text default 'all',p_kind text default 'all',p_limit integer default 12)
returns jsonb language sql stable security definer set search_path = '' as $$
 with selected as (select * from public.garage_feedback where visible and (p_game='all' or game=p_game)),
 latest as (select id,username,game,kind,rating,title,message,created_at from selected where (p_kind='all' or kind=p_kind) order by created_at desc,id desc limit greatest(1,least(coalesce(p_limit,12),50))),
 ratings as (select distinct on(client_id,game) rating from selected where kind='review' order by client_id,game,created_at desc,id desc)
 select jsonb_build_object('entries',coalesce((select jsonb_agg(latest order by created_at desc,id desc) from latest),'[]'::jsonb),
 'total',(select count(*) from selected where p_kind='all' or kind=p_kind),'rating_count',(select count(*) from ratings),'average',(select round(avg(rating),1) from ratings));
$$;
create or replace function public.list_garage_feedback_v2(p_game text default 'all',p_kind text default 'all',p_limit integer default 12)
returns jsonb language sql stable security invoker set search_path = '' as $$ select garage_private.list_feedback(p_game,p_kind,p_limit); $$;
-- Keep the previous endpoint compatible without a public privileged function.
create or replace function public.list_garage_feedback(p_game text default 'all',p_limit integer default 6)
returns jsonb language sql stable security invoker set search_path = '' as $$ select garage_private.list_feedback(p_game,'all',p_limit); $$;
revoke all on function garage_private.submit_feedback(uuid,uuid,text,text,text,integer,text,text,text), garage_private.list_feedback(text,text,integer), public.submit_garage_feedback(uuid,uuid,text,text,text,integer,text,text,text), public.list_garage_feedback(text,integer), public.list_garage_feedback_v2(text,text,integer) from public, anon, authenticated;
grant execute on function garage_private.submit_feedback(uuid,uuid,text,text,text,integer,text,text,text), garage_private.list_feedback(text,text,integer), public.submit_garage_feedback(uuid,uuid,text,text,text,integer,text,text,text), public.list_garage_feedback(text,integer), public.list_garage_feedback_v2(text,text,integer) to anon, authenticated;
notify pgrst,'reload schema';
commit;
