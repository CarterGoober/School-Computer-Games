-- Incremental v28 launch hardening. Does not create or verify any Auth accounts.
begin;
alter table acc_private.launch add column if not exists pilot_enabled boolean not null default false;
create table if not exists acc_private.pilot_allowlist (
 email_hash text primary key check(email_hash ~ '^[0-9a-f]{64}$'),
 enabled boolean not null default true,
 approved_at timestamptz not null default now()
);
alter table acc_private.pilot_allowlist enable row level security;
revoke all on acc_private.pilot_allowlist from public,anon,authenticated;
create or replace function acc_private.school_email(value text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(lower(value) ~ '^[^@[:space:]]+@leisdstudent\.ws$',false)
$$;
create or replace function acc_private.enrollment_allowed(value text) returns boolean language sql stable security definer set search_path='' as $$
 select acc_private.school_email(value) and exists(select 1 from acc_private.launch l where l.id and
  (l.ready or (l.pilot_enabled and exists(select 1 from acc_private.pilot_allowlist a where a.enabled and a.email_hash=encode(extensions.digest(lower(value),'sha256'),'hex')))))
$$;
-- Operator-only enrollment. Does not create a user, send email or verify an address.
create or replace function acc_private.approve_pilot(value text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not acc_private.school_email(value) then raise exception 'Exact school email domain required';end if;
 insert into acc_private.pilot_allowlist(email_hash) values(encode(extensions.digest(lower(value),'sha256'),'hex')) on conflict(email_hash) do update set enabled=true;
end $$;
create or replace function acc_private.register() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not acc_private.school_email(new.email) then raise exception 'Only @leisdstudent.ws student email addresses are accepted';end if;
 if tg_op='INSERT' then
  if not acc_private.enrollment_allowed(new.email) then raise exception 'Student registration is not open for this address';end if;
  if coalesce(new.raw_user_meta_data->>'username','') !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Choose a username with 3–20 letters, numbers or underscores';end if;
  insert into public.acc_profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');
 elsif not acc_private.enrollment_allowed(new.email) then raise exception 'School email is not approved for this pilot';end if;
 return new;
end $$;
create or replace function acc_private.verified() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.acc_profiles p on p.id=u.id where u.id=auth.uid()
 and u.email_confirmed_at is not null and acc_private.enrollment_allowed(u.email) and not p.suspended
 and exists(select 1 from auth.sessions s where s.user_id=u.id and s.id::text=auth.jwt()->>'session_id'))
$$;
-- Supported Supabase Auth hooks, to enable in Dashboard → Authentication → Hooks.
-- Public invoker wrappers let the dashboard select them without exposing definer code in public.
create or replace function acc_private.before_signup(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not acc_private.school_email(event->'user'->>'email') then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Only @leisdstudent.ws student email addresses are accepted'));end if;
 if not acc_private.enrollment_allowed(event->'user'->>'email') then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Student registration is not open for this address'));end if;
 return '{}'::jsonb;
end $$;
create or replace function acc_private.before_token(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u join public.acc_profiles p on p.id=u.id
 where u.id=(event->>'user_id')::uuid and u.email_confirmed_at is not null and acc_private.enrollment_allowed(u.email) and not p.suspended)
 then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Verified, approved school email required'));end if;
 return jsonb_build_object('claims',event->'claims');
end $$;
create or replace function public.acc_before_signup(event jsonb) returns jsonb language sql security invoker set search_path='' as $$select acc_private.before_signup(event)$$;
create or replace function public.acc_before_token(event jsonb) returns jsonb language sql security invoker set search_path='' as $$select acc_private.before_token(event)$$;
create or replace function acc_private.promote_pilot_moderator(value text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 select u.id into target from auth.users u join public.acc_profiles p on p.id=u.id
 where lower(u.email)=lower(value) and acc_private.school_email(u.email) and u.email_confirmed_at is not null and not p.suspended
 and exists(select 1 from acc_private.pilot_allowlist a where a.enabled and a.email_hash=encode(extensions.digest(lower(u.email),'sha256'),'hex'));
 if target is null then raise exception 'No verified, approved pilot account. No role changed';end if;
 update public.acc_profiles set role='moderator' where id=target and role='student';
 insert into acc_private.audit(actor,action,target) values(null,'operator_promote_moderator',target::text);
end $$;
revoke all on function acc_private.school_email(text),acc_private.enrollment_allowed(text),acc_private.approve_pilot(text),acc_private.before_signup(jsonb),acc_private.before_token(jsonb),acc_private.promote_pilot_moderator(text) from public,anon,authenticated;
grant execute on function acc_private.school_email(text),acc_private.enrollment_allowed(text) to authenticated;
grant usage on schema acc_private, public to supabase_auth_admin;
grant execute on function acc_private.before_signup(jsonb),acc_private.before_token(jsonb) to supabase_auth_admin;
revoke all on function public.acc_before_signup(jsonb),public.acc_before_token(jsonb) from public,anon,authenticated;
grant execute on function public.acc_before_signup(jsonb),public.acc_before_token(jsonb) to supabase_auth_admin;
-- Existing verified/registration functions keep their previous explicit privileges.
commit;
