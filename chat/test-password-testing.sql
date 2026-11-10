begin;
-- Rollback-only unconfirmed test identities; never set email_confirmed_at.
select acc_private.approve_pilot('rollback-test@leisdstudent.ws');
update acc_private.pilot_allowlist set invite_hash=encode(extensions.digest(repeat('x',64),'sha256'),'hex') where email_hash=encode(extensions.digest('rollback-test@leisdstudent.ws','sha256'),'hex');
do $$begin
 if acc_private.check_invite('outsider@leisdstudent.ws',repeat('x',64)) or acc_private.check_invite('rollback-test@leisdstudent.ws.evil.invalid',repeat('x',64)) or acc_private.check_invite('rollback-test@leisdstudent.ws','wrong') then raise exception 'Invite forgery accepted';end if;
 if not acc_private.check_invite('rollback-test@leisdstudent.ws',repeat('x',64)) then raise exception 'Correct invitation rejected';end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values('90000000-0000-0000-0000-000000000001','rollback-test@leisdstudent.ws',jsonb_build_object('username','RollbackPrivateTest','pilot_invite',repeat('x',64)));
insert into auth.sessions(id,user_id) values('90000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001');
do $$begin
 if exists(select 1 from auth.users where id='90000000-0000-0000-0000-000000000001' and (email_confirmed_at is not null or raw_user_meta_data ? 'pilot_invite')) then raise exception 'Identity falsely verified or invite retained';end if;
 if acc_private.check_invite('rollback-test@leisdstudent.ws',repeat('x',64)) then raise exception 'Invitation reusable';end if;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'rollback-test@leisdstudent.ws',jsonb_build_object('username','AnotherClaim','pilot_invite',repeat('x',64)));raise exception 'Claim replay succeeded';exception when others then if sqlerrm='Claim replay succeeded' then raise;end if;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001","session_id":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
do $$declare boot jsonb;begin
 boot:=public.acc_call('bootstrap');if boot->'self'->>'identity'<>'Unverified test account' then raise exception 'Missing unverified label';end if;
 if boot->'self'->>'role'<>'student' then raise exception 'Unexpected privileges';end if;
end $$;
reset role;
update auth.users set raw_user_meta_data=raw_user_meta_data||'{"role":"admin","email_verified":true}'::jsonb where id='90000000-0000-0000-0000-000000000001';
update acc_private.pilot_allowlist set enabled=false where claimed_by='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$begin
 if acc_private.verified() then raise exception 'Editable metadata or revoked invitation granted access';end if;
 if exists(select 1 from public.acc_messages) then raise exception 'RLS allowed revoked account';end if;
end $$;
reset role;
rollback;
select 'PASS unconfirmed identity access requires invitation/UUID binding and active session; exact domain, consumed invitation, replay rejection, unverified label, student role and revocation independent of editable metadata. Fixtures rolled back.' result;
