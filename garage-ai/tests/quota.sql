begin;
do $$declare u uuid;s uuid;v jsonb;begin
select p.id,a.id into u,s from public.acc_profiles p join auth.sessions a on a.user_id=p.id where not p.suspended and p.role='student' limit 1;
if u is null then raise exception 'Real account session required for rollback-only test';end if;
perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'session_id',s,'role','authenticated')::text,true);
delete from acc_private.ai_usage where person=u;
update acc_private.ai_limits set daily_questions=2,daily_screens=1,per_minute=5;
v:=public.acc_ai_quota(true,true);if v->>'remaining'<>'1' or v->>'screens_remaining'<>'0' then raise exception 'Wrong quota';end if;
begin perform public.acc_ai_quota(true,true);raise exception 'Screens exceeded';exception when others then if sqlerrm='Screens exceeded' then raise;end if;end;
perform public.acc_ai_quota(true,false);
begin perform public.acc_ai_quota(true,false);raise exception 'Questions exceeded';exception when others then if sqlerrm='Questions exceeded' then raise;end if;end;
update public.acc_profiles set suspended=true where id=u;
begin perform public.acc_ai_quota(false,false);raise exception 'Suspension bypass';exception when others then if sqlerrm='Suspension bypass' then raise;end if;end;
end $$;
set local role anon;
do $$begin if has_function_privilege(current_user,'public.acc_ai_quota(boolean,boolean)','execute') then raise exception 'Anonymous quota access';end if;end $$;
reset role;
rollback;
select 'PASS rollback-only per-account daily/screen caps, suspension and anonymous denial' result;
