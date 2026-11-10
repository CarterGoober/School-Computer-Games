begin;
do $$declare uid uuid;sid uuid;d jsonb;code text;begin
 select owner_id into uid from acc_private.owner_setup where id;select id into sid from auth.sessions where user_id=uid limit 1;
 if uid is null or sid is null then raise exception 'Existing owner session needed for owner-context test';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 d:=public.acc_call('createTesterInvite','{"email":"rollback-invite-student@leisdstudent.ws"}');code:=d->>'code';
 if length(code)<>64 then raise exception 'Invalid code strength';end if;
 if abs(extract(epoch from((d->>'expires')::timestamptz-now()))-86400)>1 then raise exception 'Wrong expiry';end if;
 perform set_config('acc_test.student_code',code,true);perform set_config('acc_test.student_invite',d->>'id',true);
 begin perform public.acc_call('createTesterInvite','{"email":"x@leisdstudent.ws.evil.invalid"}');raise exception 'Domain spoof accepted';exception when others then if sqlerrm='Domain spoof accepted' then raise;end if;end;
 d:=public.acc_call('createTesterInvite','{"email":"rollback-revoked@leisdstudent.ws"}');perform public.acc_call('revokeTesterInvite',jsonb_build_object('invitation',d->>'id'));
 if acc_private.check_invite('rollback-revoked@leisdstudent.ws',d->>'code') then raise exception 'Revoked invite accepted';end if;
 d:=public.acc_call('createTesterInvite','{"email":"rollback-expired@leisdstudent.ws"}');update acc_private.tester_invitations set expires=now()-interval '1 second' where id=(d->>'id')::uuid;
 if acc_private.check_invite('rollback-expired@leisdstudent.ws',d->>'code') then raise exception 'Expired invite accepted';end if;
 if acc_private.check_invite('someone-else@leisdstudent.ws',code) then raise exception 'Different address accepted';end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values('e0000000-0000-0000-0000-000000000001','rollback-invite-student@leisdstudent.ws',jsonb_build_object('username','InviteStudentTest','grade',10,'role','admin','pilot_invite',current_setting('acc_test.student_code')));
insert into auth.sessions(id,user_id) values('e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001');
do $$begin
 if (select role from public.acc_profiles where id='e0000000-0000-0000-0000-000000000001')<>'student' then raise exception 'Student invitation granted privileges';end if;
 if not exists(select 1 from acc_private.tester_invitations where id=current_setting('acc_test.student_invite')::uuid and redeemed_by='e0000000-0000-0000-0000-000000000001' and redeemed_at is not null) then raise exception 'Redemption not recorded';end if;
 if acc_private.check_invite('rollback-invite-student@leisdstudent.ws',current_setting('acc_test.student_code')) then raise exception 'Used code remains usable';end if;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'rollback-invite-student@leisdstudent.ws',jsonb_build_object('username','ReplayAttempt','grade',9,'pilot_invite',current_setting('acc_test.student_code')));raise exception 'Code redeemed twice';exception when others then if sqlerrm='Code redeemed twice' then raise;end if;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e0000000-0000-0000-0000-000000000001","session_id":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
do $$declare boot jsonb;begin
 boot:=public.acc_call('bootstrap');if boot->'self'->>'role'<>'student' or (boot->'self'->>'owner')::boolean then raise exception 'Incorrect privileges';end if;
 begin perform public.acc_call('createTesterInvite','{"email":"denied@leisdstudent.ws"}');raise exception 'Student created invitation';exception when others then if sqlerrm='Student created invitation' then raise;end if;end;
 begin perform public.acc_call('listTesterInvites');raise exception 'Student read invitations';exception when others then if sqlerrm='Student read invitations' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS owner generation, 256-bit code, 24h expiry, revoke/expiry/domain/address rejection, normal student registration/redemption, single-use replay denial, no metadata role elevation and student admin denial; fixtures rolled back.' result;
