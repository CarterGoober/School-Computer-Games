begin;
create table acc_private.ai_limits(id boolean primary key default true check(id),daily_questions integer not null default 60 check(daily_questions between 1 and 500),daily_screens integer not null default 10 check(daily_screens between 0 and 100),per_minute integer not null default 5 check(per_minute between 1 and 30));
insert into acc_private.ai_limits(id) values(true);
create table acc_private.ai_usage(person uuid not null references auth.users on delete cascade,day date not null,questions integer not null default 0,screens integer not null default 0,window_at timestamptz not null default now(),burst integer not null default 0,primary key(person,day));
alter table acc_private.ai_limits enable row level security;alter table acc_private.ai_usage enable row level security;
revoke all on acc_private.ai_limits,acc_private.ai_usage from public,anon,authenticated;
create function acc_private.ai_quota(reserve boolean,screenshot boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare u uuid:=auth.uid();d date:=(now() at time zone 'UTC')::date;l acc_private.ai_limits;v acc_private.ai_usage;begin
if not acc_private.verified() then raise exception 'Active school account required';end if;
select * into l from acc_private.ai_limits where id;
perform pg_advisory_xact_lock(hashtextextended('ai:'||u::text,0));
delete from acc_private.ai_usage where person=u and day<d-2;
insert into acc_private.ai_usage(person,day) values(u,d) on conflict do nothing;
select * into v from acc_private.ai_usage where person=u and day=d for update;
if reserve then
 if v.questions>=l.daily_questions or (screenshot and v.screens>=l.daily_screens) then raise exception 'Daily study limit reached. Resets at midnight UTC.';end if;
 if v.window_at>now()-interval '1 minute' and v.burst>=l.per_minute then raise exception 'Please wait a minute before asking again.';end if;
 update acc_private.ai_usage set questions=questions+1,screens=screens+case when screenshot then 1 else 0 end,burst=case when window_at<=now()-interval '1 minute' then 1 else burst+1 end,window_at=case when window_at<=now()-interval '1 minute' then now() else window_at end where person=u and day=d returning * into v;
end if;
return jsonb_build_object('remaining',greatest(0,l.daily_questions-v.questions),'screens_remaining',greatest(0,l.daily_screens-v.screens));end $$;
create function public.acc_ai_quota(reserve boolean default false,screenshot boolean default false) returns jsonb language sql security invoker set search_path='' as $$select acc_private.ai_quota(reserve,screenshot)$$;
revoke all on function acc_private.ai_quota(boolean,boolean),public.acc_ai_quota(boolean,boolean) from public,anon,authenticated;
grant execute on function acc_private.ai_quota(boolean,boolean),public.acc_ai_quota(boolean,boolean) to authenticated;
commit;
