begin;
create table acc_private.tester_invitations(id uuid primary key default gen_random_uuid(),email_hash text not null,code_hash text not null unique,created_by uuid not null references auth.users,created_at timestamptz not null default now(),expires timestamptz not null default now()+interval '24 hours',redeemed_by uuid references auth.users on delete set null,redeemed_at timestamptz,revoked boolean not null default false);
create index tester_invitation_email on acc_private.tester_invitations(email_hash);
alter table acc_private.tester_invitations enable row level security;
revoke all on acc_private.tester_invitations from public,anon,authenticated;
create or replace function acc_private.check_invite(value text,code text) returns boolean language sql stable security definer set search_path='' as $$
 select acc_private.school_email(value) and length(code)>=32 and exists(select 1 from acc_private.launch l join acc_private.pilot_allowlist a on a.email_hash=encode(extensions.digest(lower(value),'sha256'),'hex') join acc_private.tester_invitations i on i.email_hash=a.email_hash where l.id and not l.ready and l.pilot_enabled and l.password_testing and a.enabled and a.claimed_by is null and not i.revoked and i.redeemed_at is null and i.expires>now() and i.code_hash=encode(extensions.digest(code,'sha256'),'hex'))
$$;
-- acc_register first locks the per-email allowlist and creates a normal student.
-- This trigger consumes the matching invitation in that same signup transaction.
create function acc_private.redeem_tester_invitation() returns trigger language plpgsql security definer set search_path='' as $$begin
 if (select password_testing from acc_private.launch where id) then
 update acc_private.tester_invitations set redeemed_by=new.id,redeemed_at=now() where email_hash=encode(extensions.digest(lower(new.email),'sha256'),'hex') and code_hash=encode(extensions.digest(new.raw_user_meta_data->>'pilot_invite','sha256'),'hex') and not revoked and redeemed_at is null and expires>now();
 if not found then raise exception 'Invitation expired, revoked or already used';end if;
 end if;return new;
end $$;
create trigger acc_x_redeem_invitation after insert on auth.users for each row execute function acc_private.redeem_tester_invitation();
create function acc_private.invitations(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare value text;h text;code text;newid uuid;uid uuid:=auth.uid();begin
 if not acc_private.is_owner() then raise exception 'Owner only';end if;
 if op='listTesterInvites' then return(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select id,created_at,expires,revoked,redeemed_at,case when revoked then 'Revoked' when redeemed_at is not null then 'Used' when expires<=now() then 'Expired' else 'Active' end status from acc_private.tester_invitations order by created_at desc limit 100)x);
 elsif op='createTesterInvite' then
  value:=lower(btrim(b->>'email'));if not acc_private.school_email(value) then raise exception 'Use the exact @leisdstudent.ws email domain';end if;
  if exists(select 1 from auth.users where lower(email)=value) then raise exception 'Account already exists; use Users to manage it';end if;
  if (select count(*) from acc_private.tester_invitations where created_at>now()-interval '1 hour')>=30 then raise exception 'Invitation creation limit reached';end if;
  h:=encode(extensions.digest(value,'sha256'),'hex');perform pg_advisory_xact_lock(hashtextextended(h,1));
  insert into acc_private.pilot_allowlist(email_hash,enabled) values(h,true) on conflict(email_hash) do update set enabled=true;
  if exists(select 1 from acc_private.pilot_allowlist where email_hash=h and claimed_by is not null) then raise exception 'Address already claimed';end if;
  update acc_private.tester_invitations set revoked=true where email_hash=h and redeemed_at is null and not revoked;
  code:=encode(extensions.gen_random_bytes(32),'hex');insert into acc_private.tester_invitations(email_hash,code_hash,created_by) values(h,encode(extensions.digest(code,'sha256'),'hex'),uid) returning id into newid;
  insert into acc_private.audit(actor,action,target) values(uid,op,newid::text);
  return jsonb_build_object('id',newid,'code',code,'expires',now()+interval '24 hours');
 elsif op='revokeTesterInvite' then
  update acc_private.tester_invitations set revoked=true where id=(b->>'invitation')::uuid and redeemed_at is null;
  if not found then raise exception 'Invitation missing or already redeemed';end if;
  insert into acc_private.audit(actor,action,target) values(uid,op,b->>'invitation');
 else raise exception 'Unknown invitation operation';end if;return '{"ok":true}';
end $$;
create or replace function public.acc_call(op text,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select case when op in ('listTesterInvites','createTesterInvite','revokeTesterInvite') then acc_private.invitations(op,b) else acc_private.manage(op,b) end$$;
revoke all on function acc_private.invitations(text,jsonb),acc_private.redeem_tester_invitation() from public,anon,authenticated;
grant execute on function acc_private.invitations(text,jsonb) to authenticated;
commit;
