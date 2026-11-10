-- Current registration policy: automatic student access, no school-email identity claim.
begin;
do $$declare u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();before_grade smallint;begin
 insert into auth.users(id,email,raw_user_meta_data) values(u,'rollback-auto-'||u::text||'@leisdstudent.ws',jsonb_build_object('username','Auto'||substr(replace(u::text,'-',''),1,12),'grade',10,'role','admin'));
 insert into auth.sessions(id,user_id) values(s,u);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'session_id',s,'role','authenticated')::text,true);
 if not acc_private.verified() or not(public.acc_call('registrationStatus')->>'approved')::boolean then raise exception 'Registration still needs approval';end if;
 if (select role from public.acc_profiles where id=u)<>'student' or acc_private.is_owner() then raise exception 'Metadata granted staff role';end if;
 update auth.users set raw_user_meta_data=raw_user_meta_data||'{"grade":12,"role":"admin"}' where id=u;
 if (select grade from acc_private.grades where person=u)<>10 then raise exception 'Editable grade metadata bypass';end if;
 if acc_private.access((select room from acc_private.channel_settings where grade=12 limit 1)) then raise exception 'Cross-grade access';end if;
 update public.acc_profiles set suspended=true where id=u;if acc_private.verified() then raise exception 'Suspended signup retained access';end if;
 begin insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'reject@example.invalid','{"username":"InvalidSchool","grade":9}');raise exception 'Foreign domain registered';exception when others then if sqlerrm='Foreign domain registered' then raise;end if;end;
end $$;
rollback;
select 'PASS rollback-only automatic unverified account/session fixture: no approval, ordinary student role, grade immutability/isolation, suspension and exact domain. Not a real password signup/browser test.' result;
