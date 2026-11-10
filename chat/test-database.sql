begin;
update acc_private.launch set ready=true where id;
-- Test-only auth rows, all rolled back. No mailbox, password or permanent verified bypass.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('10000000-0000-0000-0000-000000000001','acc-test-a@leisdstudent.ws',now(),'{"username":"ChatTestA"}'),
('10000000-0000-0000-0000-000000000002','acc-test-b@leisdstudent.ws',now(),'{"username":"ChatTestB"}'),
('10000000-0000-0000-0000-000000000003','acc-test-c@leisdstudent.ws',null,'{"username":"ChatTestC"}');
insert into auth.sessions(id,user_id) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003');
do $$begin
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'bad@leisdstudent.ws.evil.test','{"username":"BadDomain"}');raise exception 'TEST DOMAIN NOT REJECTED';exception when others then if sqlerrm='TEST DOMAIN NOT REJECTED' then raise;end if;end;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'another@leisdstudent.ws','{"username":"chattesta"}');raise exception 'TEST USERNAME NOT UNIQUE';exception when unique_violation then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","session_id":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
do $$begin begin perform public.acc_call('bootstrap');raise exception 'TEST UNVERIFIED ACCEPTED';exception when others then if sqlerrm='TEST UNVERIFIED ACCEPTED' then raise;end if;end;if exists(select 1 from public.acc_messages) then raise exception 'UNVERIFIED RLS LEAK';end if;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","session_id":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$declare s jsonb; room uuid;g uuid;begin
 s:=public.acc_call('bootstrap');if jsonb_array_length(s->'rooms')<>15 then raise exception 'Default channels missing';end if;
 select (x->>'id')::uuid into room from jsonb_array_elements(s->'rooms')x where x->>'name'='general';
 perform public.acc_call('send',jsonb_build_object('room',room,'body','Test hello','nonce','30000000-0000-0000-0000-000000000001'));
 perform public.acc_call('send',jsonb_build_object('room',room,'body','Test hello','nonce','30000000-0000-0000-0000-000000000001'));
 if jsonb_array_length(public.acc_call('messages',jsonb_build_object('room',room)))<>1 then raise exception 'Retry duplicated message';end if;
 begin perform public.acc_call('send',jsonb_build_object('room',room,'body','spam','nonce',gen_random_uuid()));raise exception 'TEST RATE LIMIT FAILED';exception when others then if sqlerrm='TEST RATE LIMIT FAILED' then raise;end if;end;
 begin perform public.acc_call('dm','{"target":"10000000-0000-0000-0000-000000000002"}');raise exception 'TEST DM WITHOUT FRIEND';exception when others then if sqlerrm='TEST DM WITHOUT FRIEND' then raise;end if;end;
 begin perform public.acc_call('send',jsonb_build_object('room',(select (x->>'id')::uuid from jsonb_array_elements(s->'rooms')x where x->>'name'='announcements'),'body','No student announcement','nonce',gen_random_uuid()));raise exception 'ANNOUNCEMENT ACL FAILED';exception when others then if sqlerrm='ANNOUNCEMENT ACL FAILED' then raise;end if;end;
 perform public.acc_call('friend','{"target":"10000000-0000-0000-0000-000000000002"}');
 g:=(public.acc_call('group','{"name":"Private test group"}')->>'room')::uuid;
 perform set_config('acc_test.group',g::text,true);perform set_config('acc_test.school',room::text,true);
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","session_id":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
do $$declare g uuid:=current_setting('acc_test.group')::uuid;d uuid;begin
 begin perform public.acc_call('messages',jsonb_build_object('room',g));raise exception 'TEST PRIVATE GROUP LEAK';exception when others then if sqlerrm='TEST PRIVATE GROUP LEAK' then raise;end if;end;
 perform public.acc_call('friend','{"target":"10000000-0000-0000-0000-000000000001","choice":"accept"}');
 d:=(public.acc_call('dm','{"target":"10000000-0000-0000-0000-000000000001"}')->>'room')::uuid;perform set_config('acc_test.dm',d::text,true);
 perform public.acc_call('send',jsonb_build_object('room',d,'body','Private test hello','nonce',gen_random_uuid()));
 begin perform public.acc_call('suspend','{"target":"10000000-0000-0000-0000-000000000001","enabled":true}');raise exception 'TEST PRIVILEGE ESCALATION';exception when others then if sqlerrm='TEST PRIVILEGE ESCALATION' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","session_id":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$declare g uuid:=current_setting('acc_test.group')::uuid;v bigint;begin
 perform public.acc_call('invite',jsonb_build_object('room',g,'target','10000000-0000-0000-0000-000000000002'));
 select id into v from public.acc_messages where body='Private test hello';perform public.acc_call('reaction',jsonb_build_object('message',v,'emoji','👍'));perform public.acc_call('report',jsonb_build_object('message',v,'reason','Test report workflow'));
 perform public.acc_call('preference','{"target":"10000000-0000-0000-0000-000000000002","blocked":true}');
 if exists(select 1 from public.acc_messages where author='10000000-0000-0000-0000-000000000002') then raise exception 'BLOCK RLS LEAK';end if;
end $$;
reset role;
update public.acc_profiles set role='admin' where username='ChatTestA';
set local role authenticated;
do $$begin if jsonb_array_length(public.acc_call('reports'))<>1 then raise exception 'REPORT NOT VISIBLE TO ADMIN';end if;perform public.acc_call('resolve',jsonb_build_object('report',(public.acc_call('reports')->0->>'id')::bigint,'status','resolved','note','Test review'));if (public.acc_call('reports')->0->>'status')<>'resolved' then raise exception 'REPORT NOT RESOLVED';end if;perform public.acc_call('suspend','{"target":"10000000-0000-0000-0000-000000000002","enabled":true}');end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","session_id":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
do $$begin begin perform public.acc_call('bootstrap');raise exception 'SUSPENSION NOT ENFORCED';exception when others then if sqlerrm='SUSPENSION NOT ENFORCED' then raise;end if;end;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","session_id":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select public.acc_call('deleteAccount','{"confirm":"ChatTestA"}');
reset role;
do $$begin if exists(select 1 from auth.users where id='10000000-0000-0000-0000-000000000001') then raise exception 'ACCOUNT NOT DELETED';end if;end $$;
rollback;
select 'PASS domain/username, unverified access, school messaging/retry/rate limits, friends/DM gate, group isolation, reactions, block RLS, moderation, suspension/session revoke, deletion; fixtures rolled back' result;
