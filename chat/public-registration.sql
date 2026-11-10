-- Public account creation, with separate owner-reviewed chat admission.
-- Email confirmation stays off; no account is called a verified student.
begin;
alter table acc_private.launch add column if not exists public_signup boolean not null default false;
create or replace function acc_private.register_password_test() returns trigger language plpgsql security definer set search_path='' as $$
declare testing boolean;open_signup boolean;
begin
 if not acc_private.school_email(new.email) then raise exception 'Only @leisdstudent.ws student email addresses are accepted';end if;
 select password_testing,public_signup into testing,open_signup from acc_private.launch where id;
 if tg_op='INSERT' then
  if testing and not open_signup then
   perform 1 from acc_private.pilot_allowlist where email_hash=encode(extensions.digest(lower(new.email),'sha256'),'hex') for update;
   if not coalesce(acc_private.check_invite(new.email,new.raw_user_meta_data->>'pilot_invite'),false) then raise exception 'Approved private invitation required';end if;
  elsif not testing and not acc_private.enrollment_allowed(new.email) then raise exception 'Student registration is closed';end if;
  if coalesce(new.raw_user_meta_data->>'username','') !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Choose a unique username with 3–20 letters, numbers or underscores';end if;
  insert into public.acc_profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');
  if testing then
   if not open_signup then update acc_private.pilot_allowlist set claimed_by=new.id,invite_hash=null where email_hash=encode(extensions.digest(lower(new.email),'sha256'),'hex');end if;
   insert into acc_private.test_identities(person,email_hash) values(new.id,encode(extensions.digest(lower(new.email),'sha256'),'hex'));
   update auth.users set raw_user_meta_data=raw_user_meta_data-'pilot_invite' where id=new.id;
  end if;
 elsif new.email is distinct from old.email then
  if exists(select 1 from acc_private.test_identities where person=new.id) then raise exception 'Test account email changes require the operator';end if;
  if not acc_private.enrollment_allowed(new.email) then raise exception 'Email is not approved';end if;
 end if;return new;
end $$;
create or replace function acc_private.redeem_tester_invitation() returns trigger language plpgsql security definer set search_path='' as $$begin
 if (select password_testing and not public_signup from acc_private.launch where id) then
 update acc_private.tester_invitations set redeemed_by=new.id,redeemed_at=now() where email_hash=encode(extensions.digest(lower(new.email),'sha256'),'hex') and code_hash=encode(extensions.digest(new.raw_user_meta_data->>'pilot_invite','sha256'),'hex') and not revoked and redeemed_at is null and expires>now();
 if not found then raise exception 'Invitation expired, revoked or already used';end if;
 end if;return new;
end $$;
create or replace function acc_private.before_signup(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not acc_private.school_email(event->'user'->>'email') then return '{"error":{"http_code":403,"message":"Exact school email required"}}';end if;
 if (select public_signup and password_testing and not ready from acc_private.launch where id) then return '{}';end if;
 if (select password_testing from acc_private.launch where id) then
  if not coalesce(acc_private.check_invite(event->'user'->>'email',event->'user'->'user_metadata'->>'pilot_invite'),false) then return '{"error":{"http_code":403,"message":"Private invitation required"}}';end if;
 elsif not acc_private.enrollment_allowed(event->'user'->>'email') then return '{"error":{"http_code":403,"message":"Registration closed"}}';end if;return '{}';
end $$;
create or replace function acc_private.before_token(event jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u join public.acc_profiles p on p.id=u.id where u.id=(event->>'user_id')::uuid and not p.suspended and acc_private.school_email(u.email)
 and ((exists(select 1 from acc_private.launch where id and public_signup and password_testing and not ready)) or acc_private.test_access(u.id,u.email) or (not exists(select 1 from acc_private.test_identities where person=u.id) and u.email_confirmed_at is not null and acc_private.enrollment_allowed(u.email)))) then return '{"error":{"http_code":403,"message":"Approved account required"}}';end if;return jsonb_build_object('claims',event->'claims');
end $$;

create or replace function acc_private.admission(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t uuid;h text;n text;
begin
 if not exists(select 1 from auth.users a join public.acc_profiles p on p.id=a.id where a.id=u and not p.suspended and acc_private.school_email(a.email) and exists(select 1 from auth.sessions s where s.user_id=u and s.id::text=auth.jwt()->>'session_id')) then raise exception 'Active school account session required';end if;
 if op='registrationStatus' then return jsonb_build_object('id',u,'username',(select username from public.acc_profiles where id=u),'approved',acc_private.verified(),'identity','Unverified account');end if;
 if op='deletePendingRegistration' then
  if acc_private.verified() or exists(select 1 from acc_private.owner_setup where owner_id=u or candidate=u) then raise exception 'Use account Settings for an approved account';end if;
  if not exists(select 1 from public.acc_profiles where id=u and username=b->>'confirm') then raise exception 'Type your username to confirm deletion';end if;
  delete from auth.sessions where user_id=u;delete from auth.users where id=u;return '{"ok":true}';
 end if;
 if not acc_private.is_owner() then raise exception 'Owner only';end if;
 if op='pendingRegistrations' then
  return(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select p.id,p.username,g.grade,p.suspended,i.created_at from acc_private.test_identities i join public.acc_profiles p on p.id=i.person left join acc_private.grades g on g.person=p.id where not exists(select 1 from acc_private.pilot_allowlist a where a.email_hash=i.email_hash and a.claimed_by=i.person and a.enabled) order by i.created_at limit 200)x);
 end if;
 if op not in ('approveRegistration','revokeRegistration') then raise exception 'Unknown registration operation';end if;
 t:=(b->>'target')::uuid;
 if t is null or t=u or exists(select 1 from acc_private.owner_setup where owner_id=t) then raise exception 'Owner account protected';end if;
 perform 1 from public.acc_profiles where id=t for update;
 select i.email_hash,p.username into h,n from acc_private.test_identities i join public.acc_profiles p on p.id=i.person where i.person=t;
 if h is null then raise exception 'No unverified registration';end if;
 if op='approveRegistration' then
  if b->>'confirm' is distinct from t::text or b->>'reviewed' is distinct from 'true' then raise exception 'Confirm the actual account ID after independent review; email is not identity proof';end if;
  if not exists(select 1 from public.acc_profiles where id=t and not suspended and role='student') then raise exception 'Only an unsuspended student account may be admitted';end if;
  insert into acc_private.pilot_allowlist(email_hash,enabled,claimed_by) values(h,true,t) on conflict(email_hash) do update set enabled=true,claimed_by=t,invite_hash=null where acc_private.pilot_allowlist.claimed_by is null or acc_private.pilot_allowlist.claimed_by=t;
  if not found then raise exception 'Address belongs to another admitted account';end if;
 else update acc_private.pilot_allowlist set enabled=false where email_hash=h and claimed_by=t;
 end if;
 insert into acc_private.audit(actor,action,target) values(u,op,t::text);return '{"ok":true}';
end $$;
revoke all on function acc_private.admission(text,jsonb) from public,anon,authenticated;
grant execute on function acc_private.admission(text,jsonb) to authenticated;
create or replace function public.acc_call(op text,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select case when op in ('registrationStatus','pendingRegistrations','approveRegistration','revokeRegistration','deletePendingRegistration') then acc_private.admission(op,b) when op in ('listTesterInvites','createTesterInvite','revokeTesterInvite') then acc_private.invitations(op,b) else acc_private.manage(op,b) end$$;
-- Only account creation opens. ready remains false and existing RLS/eligibility remains unchanged.
update acc_private.launch set public_signup=true where id and password_testing and not ready;
commit;
