-- Read-only checks plus rollback-only enrollment-policy tests. NO Auth users/sessions are created.
begin;
do $$begin
 if (select ready or pilot_enabled from acc_private.launch where id) then raise exception 'Registration gates must remain closed during setup';end if;
 if acc_private.verified() then raise exception 'Unauthenticated access accepted';end if;
 if has_function_privilege('anon','public.acc_call(text,jsonb)','execute') or has_table_privilege('anon','public.acc_messages','select') then raise exception 'Anonymous chat access';end if;
 if has_function_privilege('authenticated','acc_private.approve_pilot(text)','execute') or has_function_privilege('authenticated','acc_private.promote_pilot_moderator(text)','execute') then raise exception 'Client can enroll/promote accounts';end if;
 if has_function_privilege('authenticated','public.acc_before_token(jsonb)','execute') then raise exception 'Client can invoke Auth hook';end if;
 if acc_private.school_email('a@leisdstudent.ws.evil.invalid') or acc_private.school_email('a@sub.leisdstudent.ws') or acc_private.school_email('a@@leisdstudent.ws') or acc_private.school_email('a@leisdstudent.ws ') or acc_private.school_email(null) then raise exception 'Domain spoof allowed';end if;
 if not acc_private.school_email('example@leisdstudent.ws') then raise exception 'Exact domain rejected';end if;
 if not (acc_private.before_signup('{"user":{"email":"x@example.invalid"}}') ? 'error') then raise exception 'Hook failed domain rejection';end if;
 if not (acc_private.before_token('{"user_id":"00000000-0000-0000-0000-000000000000","claims":{}}') ? 'error') then raise exception 'Token hook accepted nonexistent user';end if;
end $$;
-- A disposable allowlist entry exercises enrollment routing; it is not an Auth account and cannot verify email.
select acc_private.approve_pilot('transaction-only-policy-test@leisdstudent.ws');
update acc_private.launch set pilot_enabled=true where id;
do $$begin
 if not acc_private.enrollment_allowed('transaction-only-policy-test@leisdstudent.ws') then raise exception 'Pilot allowlist not applied';end if;
 if acc_private.enrollment_allowed('not-on-this-list@leisdstudent.ws') then raise exception 'Pilot opened public enrollment';end if;
 if acc_private.verified() then raise exception 'Enrollment incorrectly bypassed verification';end if;
 begin perform acc_private.promote_pilot_moderator('transaction-only-policy-test@leisdstudent.ws');raise exception 'Unverified promotion accepted';exception when others then if sqlerrm='Unverified promotion accepted' then raise;end if;end;
end $$;
set local role authenticated;
do $$begin
 if exists(select 1 from public.acc_messages) then raise exception 'RLS exposed messages without verified session';end if;
 begin perform public.acc_call('bootstrap');raise exception 'Unverified RPC accepted';exception when others then if sqlerrm='Unverified RPC accepted' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS exact-domain/spoof policy, closed gates, pilot-only enrollment, no verification bypass, unverified moderator rejection, hook ACLs, anonymous denial and unverified RLS/RPC. No Auth users created.' result;
