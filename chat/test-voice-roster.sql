begin;
do $$declare u uuid;sid uuid;own_grade smallint;r uuid;other_room uuid;rows jsonb;begin
select p.id,s.id into u,sid from public.acc_profiles p join auth.sessions s on s.user_id=p.id where p.role='student' and not p.suspended limit 1;
if u is null then raise exception 'Existing student session required';end if;
perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'session_id',sid,'role','authenticated')::text,true);
select grade into own_grade from acc_private.grades where person=u;
select room into other_room from acc_private.channel_settings where grade<>own_grade limit 1;
select id into r from public.acc_rooms where name='general' and kind='school';
rows:=public.acc_voice_rosters(array[r,other_room]);
if not exists(select 1 from jsonb_array_elements(rows) x where x->>'room'=r::text) then raise exception 'Permitted official room missing';end if;
if exists(select 1 from jsonb_array_elements(rows) x where x->>'room'=other_room::text) then raise exception 'Other grade roster exposed';end if;
update public.acc_profiles set suspended=true where id=u;
begin perform public.acc_voice_rosters(array[r]);raise exception 'Suspended roster permitted';exception when others then if sqlerrm='Suspended roster permitted' then raise;end if;end;
end $$;
set local role anon;
do $$begin if has_function_privilege(current_user,'public.acc_voice_rosters(uuid[])','execute') then raise exception 'Anonymous roster access';end if;end $$;
reset role;
rollback;
select 'PASS official roster access, cross-grade denial, suspended and anonymous denial; rollback only' result;
