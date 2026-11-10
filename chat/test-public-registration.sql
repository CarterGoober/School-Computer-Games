begin;
do $$declare own uuid;student uuid;os uuid;ss uuid;ev jsonb;newid uuid:=gen_random_uuid();name text:='reg_'||substr(replace(gen_random_uuid()::text,'-',''),1,12);begin
 select owner_id into own from acc_private.owner_setup where id;
 select id into student from public.acc_profiles where id<>own and role='student' and not suspended limit 1;
 select id into os from auth.sessions where user_id=own limit 1;select id into ss from auth.sessions where user_id=student limit 1;
 if own is null or student is null or os is null or ss is null then raise exception 'Two real account sessions required';end if;
 if not(select public_signup and not ready from acc_private.launch where id) then raise exception 'Public account signup must open while messaging stays gated';end if;
 foreach ev in array array['{"user":{"email":"not-student@example.com"}}'::jsonb,'{"user":{"email":"a@leisdstudent.ws.attacker.test"}}'::jsonb,'{"user":{"email":"a@sub.leisdstudent.ws"}}'::jsonb] loop
  if not(acc_private.before_signup(ev)?'error') then raise exception 'Invalid domain passed';end if;
 end loop;
 if acc_private.before_signup('{"user":{"email":"public-check@leisdstudent.ws"}}')?'error' then raise exception 'School signup still requires invitation';end if;
 -- Trigger-only, unverified throwaway fixture. No password, session, confirmation or email; rolled back.
 insert into auth.users(id,email,raw_user_meta_data) values(newid,'test-'||newid::text||'@leisdstudent.ws',jsonb_build_object('username',name,'grade',10,'role','admin','email_verified',true));
 if (select role from public.acc_profiles where id=newid)<>'student' or exists(select 1 from acc_private.pilot_allowlist where claimed_by=newid) or not exists(select 1 from acc_private.test_identities where person=newid) then raise exception 'Public signup granted access or role';end if;
 if (select grade from acc_private.grades where person=newid)<>10 then raise exception 'Grade registration failed';end if;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'dup-'||newid::text||'@leisdstudent.ws',jsonb_build_object('username',upper(name),'grade',9));raise exception 'Duplicate username allowed';exception when unique_violation then null;end;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'no-domain@example.com',jsonb_build_object('username','other_'+substr(name,5),'grade',9));raise exception 'Trigger allowed wrong domain';exception when others then if sqlerrm='Trigger allowed wrong domain' then raise;end if;end;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'badgrade-'||newid::text||'@leisdstudent.ws',jsonb_build_object('username','grade_'+substr(name,5),'grade',8));raise exception 'Invalid grade allowed';exception when others then if sqlerrm='Invalid grade allowed' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',own,'session_id',os,'role','authenticated')::text,true);
 perform public.acc_call('revokeRegistration',jsonb_build_object('target',student));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'session_id',ss,'role','authenticated')::text,true);
 if (public.acc_call('registrationStatus')->>'approved')::boolean or acc_private.verified() then raise exception 'Revoked account retained access';end if;
 if acc_private.before_token(jsonb_build_object('user_id',student,'claims','{}'::jsonb))?'error' then raise exception 'Pending account cannot log in to review state';end if;
 begin perform public.acc_call('approveRegistration',jsonb_build_object('target',student,'confirm',student,'reviewed',true));raise exception 'Self approval allowed';exception when others then if sqlerrm='Self approval allowed' then raise;end if;end;
 begin perform public.acc_call('bootstrap');raise exception 'Pending bootstrap allowed';exception when others then if sqlerrm='Pending bootstrap allowed' then raise;end if;end;
 begin perform public.acc_call('send',jsonb_build_object('room',(select id from public.acc_rooms limit 1),'body','Forbidden pending message','nonce',gen_random_uuid()));raise exception 'Pending send allowed';exception when others then if sqlerrm='Pending send allowed' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',own,'session_id',os,'role','authenticated')::text,true);
 if jsonb_array_length(public.acc_call('pendingRegistrations'))<1 then raise exception 'Pending list empty';end if;
 begin perform public.acc_call('approveRegistration',jsonb_build_object('target',student));raise exception 'Unreviewed approval';exception when others then if sqlerrm='Unreviewed approval' then raise;end if;end;
 perform public.acc_call('approveRegistration',jsonb_build_object('target',student,'confirm',student,'reviewed',true));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'session_id',ss,'role','authenticated')::text,true);
 if not (public.acc_call('registrationStatus')->>'approved')::boolean or not acc_private.verified() then raise exception 'Reviewed actual account not admitted';end if;
 if acc_private.is_owner() or acc_private.can('announcements') then raise exception 'Admission granted staff role';end if;
 begin perform public.acc_call('deletePendingRegistration',jsonb_build_object('confirm',(select username from public.acc_profiles where id=student)));raise exception 'Approved pending-delete path allowed';exception when others then if sqlerrm='Approved pending-delete path allowed' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',own,'session_id',os,'role','authenticated')::text,true);
 perform public.acc_call('revokeRegistration',jsonb_build_object('target',student));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'session_id',ss,'role','authenticated')::text,true);
 begin perform public.acc_call('deletePendingRegistration','{"confirm":"wrong-username"}');raise exception 'Deletion confirmation missing';exception when others then if sqlerrm='Deletion confirmation missing' then raise;end if;end;
 -- Exercise deletion for the actual pending student in a nested rollback, then restore it.
 begin
  perform public.acc_call('deletePendingRegistration',jsonb_build_object('confirm',(select username from public.acc_profiles where id=student),'target',own));
  if exists(select 1 from auth.users where id=student) or not exists(select 1 from auth.users where id=own) then raise exception 'Deletion targeted wrong account';end if;
  raise exception using errcode='ZX001',message='Rollback successful pending deletion';
 exception when sqlstate 'ZX001' then null;end;
end $$;
set local role authenticated;
do $$begin
 if exists(select 1 from public.acc_messages) then raise exception 'Pending identity can read messages through RLS';end if;
 if has_table_privilege(current_user,'acc_private.pilot_allowlist','UPDATE') or has_table_privilege(current_user,'acc_private.test_identities','INSERT') then raise exception 'Client can approve itself';end if;
end $$;
reset role;
set local role anon;
do $$begin
 if has_table_privilege(current_user,'public.acc_messages','SELECT') or has_function_privilege(current_user,'public.acc_call(text,jsonb)','EXECUTE') then raise exception 'Anonymous chat grants';end if;
end $$;
reset role;
rollback;
select 'PASS public signup hooks/triggers, exact domain, unique username, grade, default student role, pending denial, actual-account owner approval/revocation, RLS and anonymous denial. Unverified signup fixture and two real account-context changes rolled back; not a real password signup/browser messaging test.' result;
