begin;
-- Unconfirmed test fixtures only; all accounts/messages/settings roll back.
do $$declare n integer;pid uuid;sid uuid;addr text;roomid uuid;begin
 for n in 9..12 loop
 pid:=('a0000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid;sid:=('b0000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid;addr:='rollback-grade-'||n||'@leisdstudent.ws';
 perform acc_private.approve_pilot(addr);update acc_private.pilot_allowlist set invite_hash=encode(extensions.digest(repeat('z',64),'sha256'),'hex') where email_hash=encode(extensions.digest(addr,'sha256'),'hex');
 insert into auth.users(id,email,raw_user_meta_data) values(pid,addr,jsonb_build_object('username','RollbackGrade'||n,'grade',n,'pilot_invite',repeat('z',64)));
 insert into auth.sessions(id,user_id) values(sid,pid);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',pid,'session_id',sid,'role','authenticated')::text,true);
 if (select grade from acc_private.grades where person=pid)<>n then raise exception 'Grade assignment failed';end if;
 for roomid in select room from acc_private.channel_settings where grade is not null loop
 if acc_private.access(roomid) is distinct from ((select grade from acc_private.channel_settings where room=roomid)=n) then raise exception 'Cross-grade access mismatch';end if;
 end loop;
 if not acc_private.access((select id from public.acc_rooms where name='general' limit 1)) then raise exception 'School channel unavailable';end if;
 begin perform public.acc_call('adminSnapshot');raise exception 'Student admin escalation';exception when others then if sqlerrm='Student admin escalation' then raise;end if;end;
 begin perform public.acc_call('send',jsonb_build_object('room',(select id from public.acc_rooms where name='announcements' limit 1),'body','No student announcements','nonce',gen_random_uuid()));raise exception 'Student announcement allowed';exception when others then if sqlerrm='Student announcement allowed' then raise;end if;end;
 end loop;
end $$;
update auth.users set raw_user_meta_data=raw_user_meta_data||'{"grade":12,"role":"admin"}'::jsonb where id='a0000000-0000-0000-0000-000000000009';
do $$begin if (select grade from acc_private.grades where person='a0000000-0000-0000-0000-000000000009')<>9 or (select role from public.acc_profiles where id='a0000000-0000-0000-0000-000000000009')<>'student' then raise exception 'Metadata impersonated grade/role';end if;end $$;
-- The actual owner record is changed only within this rollback transaction.
update acc_private.owner_setup set candidate='a0000000-0000-0000-0000-000000000009',owner_id=null,code_hash=encode(extensions.digest(repeat('o',64),'sha256'),'hex'),expires=now()+interval '1 hour';
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000010","session_id":"b0000000-0000-0000-0000-000000000010","role":"authenticated"}',true);
do $$begin begin perform public.acc_call('claimOwner',jsonb_build_object('code',repeat('o',64)));raise exception 'Wrong account claimed owner';exception when others then if sqlerrm='Wrong account claimed owner' then raise;end if;end;end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000009","session_id":"b0000000-0000-0000-0000-000000000009","role":"authenticated"}',true);
do $$declare invite jsonb;begin
 perform public.acc_call('claimOwner',jsonb_build_object('code',repeat('o',64)));if not acc_private.is_owner() then raise exception 'Owner setup failed';end if;
 begin perform public.acc_call('claimOwner',jsonb_build_object('code',repeat('o',64)));raise exception 'Owner token reused';exception when others then if sqlerrm='Owner token reused' then raise;end if;end;
 perform public.acc_call('send',jsonb_build_object('room',(select id from public.acc_rooms where name='announcements' limit 1),'body','Owner announcement','nonce',gen_random_uuid()));
 invite:=public.acc_call('inviteModerator','{"email":"rollback-grade-10@leisdstudent.ws"}');perform set_config('acc_test.invite',invite->>'code',true);
end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000011","session_id":"b0000000-0000-0000-0000-000000000011","role":"authenticated"}',true);
do $$begin begin perform public.acc_call('acceptModerator',jsonb_build_object('code',current_setting('acc_test.invite')));raise exception 'Wrong recipient accepted invitation';exception when others then if sqlerrm='Wrong recipient accepted invitation' then raise;end if;end;end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000010","session_id":"b0000000-0000-0000-0000-000000000010","role":"authenticated"}',true);
do $$begin
 perform public.acc_call('acceptModerator',jsonb_build_object('code',current_setting('acc_test.invite')));if not acc_private.can('reports') or acc_private.can('announcements') or acc_private.can('ban') then raise exception 'Unsafe moderator defaults';end if;
 begin perform public.acc_call('setCommunity','{"chat_paused":true,"groups_enabled":false}');raise exception 'Moderator changed settings';exception when others then if sqlerrm='Moderator changed settings' then raise;end if;end;
 perform public.acc_call('requestGrade','{"grade":12}');if (select grade from acc_private.grades where person=auth.uid())<>10 then raise exception 'Grade request bypassed approval';end if;
 begin perform public.acc_call('send',jsonb_build_object('room',(select id from public.acc_rooms where name='announcements' limit 1),'body','Mod announcement without permission','nonce',gen_random_uuid()));raise exception 'Moderator announcement allowed';exception when others then if sqlerrm='Moderator announcement allowed' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000009","session_id":"b0000000-0000-0000-0000-000000000009","role":"authenticated"}',true);
select public.acc_call('setModerator','{"target":"a0000000-0000-0000-0000-000000000010","permissions":{"reports":true,"messages":true,"mute":true,"announcements":true,"ban":false}}');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000010","session_id":"b0000000-0000-0000-0000-000000000010","role":"authenticated"}',true);
select public.acc_call('send',jsonb_build_object('room',(select id from public.acc_rooms where name='announcements' limit 1),'body','Explicitly permitted moderator announcement','nonce',gen_random_uuid()));
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000009","session_id":"b0000000-0000-0000-0000-000000000009","role":"authenticated"}',true);
select public.acc_call('setGrade','{"target":"a0000000-0000-0000-0000-000000000010","grade":12}');
select public.acc_call('revokeModerator','{"target":"a0000000-0000-0000-0000-000000000010"}');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000010","session_id":"b0000000-0000-0000-0000-000000000010","role":"authenticated"}',true);
do $$begin if acc_private.can('reports') then raise exception 'Revoked moderator kept permission';end if;if (select grade from acc_private.grades where person=auth.uid())<>12 then raise exception 'Grade approval failed';end if;end $$;
select set_config('acc_test.grade9',(select room::text from acc_private.channel_settings where grade=9 limit 1),true);
set local role authenticated;
do $$begin
 if has_function_privilege('authenticated','acc_private.legacy_call(text,jsonb)','execute') then raise exception 'Legacy bypass callable';end if;
 if exists(select 1 from public.acc_messages where room=current_setting('acc_test.grade9')::uuid) then raise exception 'Cross-grade RLS leak';end if;
end $$;
reset role;
rollback;
select 'PASS all four grade registrations, cross-grade permissions/RLS, owner UUID+single-use code, owner announcements, moderator intended-recipient acceptance, safe defaults, settings denial, grade approval and revocation; all fixtures rolled back.' result;
