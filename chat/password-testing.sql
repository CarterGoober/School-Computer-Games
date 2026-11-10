begin;
alter table acc_private.launch add column if not exists password_testing boolean not null default false;
alter table acc_private.pilot_allowlist add column if not exists invite_hash text;
alter table acc_private.pilot_allowlist add column if not exists claimed_by uuid references auth.users on delete set null;
create table if not exists acc_private.test_identities(person uuid primary key references auth.users on delete cascade,email_hash text not null,created_at timestamptz default now());
alter table acc_private.test_identities enable row level security;
revoke all on acc_private.test_identities from public,anon,authenticated;
create or replace function acc_private.test_access(person uuid,value text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from acc_private.launch l join acc_private.test_identities i on i.person=$1 join acc_private.pilot_allowlist a on a.email_hash=i.email_hash and a.claimed_by=i.person where l.id and l.pilot_enabled and l.password_testing and not l.ready and a.enabled and acc_private.school_email(value) and i.email_hash=encode(extensions.digest(lower(value),'sha256'),'hex'))
$$;
create or replace function acc_private.check_invite(value text,code text) returns boolean language sql stable security definer set search_path='' as $$
 select acc_private.school_email(value) and length(code)>=32 and exists(select 1 from acc_private.launch l join acc_private.pilot_allowlist a on a.email_hash=encode(extensions.digest(lower(value),'sha256'),'hex') where l.id and not l.ready and l.pilot_enabled and l.password_testing and a.enabled and a.claimed_by is null and a.invite_hash=encode(extensions.digest(code,'sha256'),'hex'))
$$;
create or replace function acc_private.register() returns trigger language plpgsql security definer set search_path='' as $$
declare testing boolean;
begin
 if not acc_private.school_email(new.email) then raise exception 'Only @leisdstudent.ws student email addresses are accepted';end if;
 select password_testing into testing from acc_private.launch where id;
 if tg_op='INSERT' then
  if testing then
   perform 1 from acc_private.pilot_allowlist where email_hash=encode(extensions.digest(lower(new.email),'sha256'),'hex') for update;
   if not coalesce(acc_private.check_invite(new.email,new.raw_user_meta_data->>'pilot_invite'),false) then raise exception 'Approved private invitation required';end if;
  elsif not acc_private.enrollment_allowed(new.email) then raise exception 'Student registration is closed';end if;
  if coalesce(new.raw_user_meta_data->>'username','') !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Choose a unique username with 3–20 letters, numbers or underscores';end if;
  insert into public.acc_profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');
  if testing then
   update acc_private.pilot_allowlist set claimed_by=new.id,invite_hash=null where email_hash=encode(extensions.digest(lower(new.email),'sha256'),'hex');
   insert into acc_private.test_identities(person,email_hash) values(new.id,encode(extensions.digest(lower(new.email),'sha256'),'hex'));
   update auth.users set raw_user_meta_data=raw_user_meta_data-'pilot_invite' where id=new.id;
  end if;
 elsif new.email is distinct from old.email then
  if exists(select 1 from acc_private.test_identities where person=new.id) then raise exception 'Test account email changes require the operator';end if;
  if not acc_private.enrollment_allowed(new.email) then raise exception 'Email is not approved';end if;
 end if;return new;
end $$;
create or replace function acc_private.verified() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.acc_profiles p on p.id=u.id where u.id=auth.uid() and not p.suspended and acc_private.school_email(u.email)
 and (acc_private.test_access(u.id,u.email) or (not exists(select 1 from acc_private.test_identities where person=u.id) and u.email_confirmed_at is not null and acc_private.enrollment_allowed(u.email)))
 and exists(select 1 from auth.sessions s where s.user_id=u.id and s.id::text=auth.jwt()->>'session_id'))
$$;
create or replace function acc_private.before_signup(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not acc_private.school_email(event->'user'->>'email') then return '{"error":{"http_code":403,"message":"Exact school email required"}}';end if;
 if (select password_testing from acc_private.launch where id) then
  if not coalesce(acc_private.check_invite(event->'user'->>'email',event->'user'->'user_metadata'->>'pilot_invite'),false) then return '{"error":{"http_code":403,"message":"Private invitation required"}}';end if;
 elsif not acc_private.enrollment_allowed(event->'user'->>'email') then return '{"error":{"http_code":403,"message":"Registration closed"}}';end if;return '{}';
end $$;
create or replace function acc_private.before_token(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u join public.acc_profiles p on p.id=u.id where u.id=(event->>'user_id')::uuid and not p.suspended and acc_private.school_email(u.email)
 and (acc_private.test_access(u.id,u.email) or (not exists(select 1 from acc_private.test_identities where person=u.id) and u.email_confirmed_at is not null and acc_private.enrollment_allowed(u.email)))) then return '{"error":{"http_code":403,"message":"Approved account required"}}';end if;return jsonb_build_object('claims',event->'claims');
end $$;
-- Keep legacy RPC name for existing RLS policies; its meaning is authenticated eligibility, not identity verification.
create or replace function public.acc_call(op text,b jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=acc_private.call(op,b);
 if op='bootstrap' then result:=jsonb_set(result,'{self,identity}',to_jsonb('Unverified test account'::text));end if;
 return result;
end $$;
revoke all on function acc_private.test_access(uuid,text),acc_private.check_invite(text,text) from public,anon,authenticated;
-- Block test accounts from the email-verified moderator helper even if Auth autoconfirms them.
create or replace function acc_private.promote_pilot_moderator(value text) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users u join acc_private.test_identities i on i.person=u.id where lower(u.email)=lower(value)) then raise exception 'Test identity is not email verified; operator must explicitly designate a test moderator';end if;
 update public.acc_profiles p set role='moderator' from auth.users u where u.id=p.id and lower(u.email)=lower(value) and u.email_confirmed_at is not null and not p.suspended and p.role='student' and acc_private.school_email(u.email) and exists(select 1 from acc_private.pilot_allowlist a where a.enabled and a.email_hash=encode(extensions.digest(lower(u.email),'sha256'),'hex'));if not found then raise exception 'No verified, approved student account';end if;
end $$;
update acc_private.launch set ready=false,pilot_enabled=true,password_testing=true where id;
commit;
