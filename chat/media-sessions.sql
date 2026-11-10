-- Phase 2 pilot lifecycle; apply after media-authorization.sql.
begin;
create table acc_private.media_release(id boolean primary key default true check(id),enabled boolean not null default false,last_sweep timestamptz);
insert into acc_private.media_release(id) values(true);
create table acc_private.media_leases(id uuid primary key default gen_random_uuid(),person uuid unique not null,session_id uuid not null,room uuid not null,expires timestamptz not null,grant_data jsonb not null,applied jsonb,window_at timestamptz not null default now(),requests integer not null default 0,joins integer not null default 0,created_at timestamptz not null default now());
create index media_lease_room on acc_private.media_leases(room);
alter table acc_private.media_release enable row level security;
alter table acc_private.media_leases enable row level security;
revoke all on acc_private.media_release,acc_private.media_leases from public,anon,authenticated;
create function acc_private.media_session(op text,r uuid default null,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare u uuid:=auth.uid();g jsonb;l acc_private.media_leases;begin
 if op='status' then return jsonb_build_object('enabled',(select enabled from acc_private.media_release where id),'pilot',acc_private.server_pilot());end if;
 if not acc_private.server_pilot() then raise exception 'Approved pilot session required';end if;
 if op='config' then
  if not acc_private.is_owner() then raise exception 'Owner only';end if;
  if not exists(select 1 from public.acc_rooms where id=r) then raise exception 'Unknown room';end if;
  insert into acc_private.voice_channels(room,capacity,camera,screen) values(r,least(24,greatest(2,coalesce((b->>'capacity')::integer,8))),coalesce((b->>'camera')::boolean,false),coalesce((b->>'screen')::boolean,false)) on conflict(room) do update set capacity=excluded.capacity,camera=excluded.camera,screen=excluded.screen;
  return '{"ok":true}';
 end if;
 if op='enable' then if not acc_private.is_owner() then raise exception 'Owner only';end if;update acc_private.media_release set enabled=(b->>'enabled')::boolean where id;return '{"ok":true}';end if;
 perform pg_advisory_xact_lock(hashtextextended('voice-user:'||u::text,0));
 select * into l from acc_private.media_leases where person=u for update;
 if op='leave' then if l.id is not null then update acc_private.media_leases set expires=now()-interval '1 second' where id=l.id;end if;return jsonb_build_object('lease',to_jsonb(l));end if;
 if not (select enabled from acc_private.media_release where id) then raise exception 'Voice pilot is disabled';end if;
 if op not in ('join','heartbeat') then raise exception 'Unknown media operation';end if;
 g:=acc_private.media_authorize(r);
 if l.id is not null then
  if l.window_at<now()-interval '1 minute' then l.requests:=0;l.joins:=0;l.window_at:=now();end if;
  if l.requests>=40 or (op='join' and l.joins>=10) then raise exception 'Slow down voice requests';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('voice-room:'||r::text,0));
 if l.id is not null and (l.room<>r or l.session_id::text<>auth.jwt()->>'session_id' or l.expires<=now()) then raise exception 'Disconnect the previous call first';end if;
 if l.id is null then
  if (select count(*) from acc_private.media_leases)>=32 then raise exception 'Voice pilot capacity reached';end if;
  if (select count(*) from acc_private.media_leases where room=r)>=(g->>'capacity')::integer then raise exception 'Voice room is full';end if;
  if op='heartbeat' then raise exception 'No active call';end if;
  insert into acc_private.media_leases(person,session_id,room,expires,grant_data) values(u,(auth.jwt()->>'session_id')::uuid,r,now()+interval '50 seconds',g) returning * into l;
 else update acc_private.media_leases set expires=now()+interval '50 seconds',grant_data=g where id=l.id returning * into l;end if;
 update acc_private.media_leases set requests=case when window_at<now()-interval '1 minute' then 1 else requests+1 end,joins=case when window_at<now()-interval '1 minute' then case when op='join' then 1 else 0 end else joins+case when op='join' then 1 else 0 end end,window_at=case when window_at<now()-interval '1 minute' then now() else window_at end where id=l.id;
 if exists(select 1 from acc_private.media_leases other where other.room=r and other.person<>u and acc_private.blocked(u,other.person)) then raise exception 'Blocked participant in this room';end if;
 return jsonb_build_object('lease',to_jsonb(l),'name',(select username from public.acc_profiles where id=u),'grant',g,'changed',l.applied is distinct from g);
end $$;
create function public.acc_media_session(op text,room uuid default null,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select acc_private.media_session(op,room,b)$$;
revoke all on function acc_private.media_session(text,uuid,jsonb),public.acc_media_session(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function acc_private.media_session(text,uuid,jsonb),public.acc_media_session(text,uuid,jsonb) to authenticated;
-- Service-only bridge for SFU enforcement. Clients cannot delete leases, forge grants or skip capacity.
create function acc_private.media_service(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare l acc_private.media_leases;g jsonb;original text:=current_setting('request.jwt.claims',true);items jsonb:='[]';ok boolean;begin
 if op='ack' then
  if coalesce((b->>'removed')::boolean,false) then delete from acc_private.media_leases where id=(b->>'lease')::uuid;
  else update acc_private.media_leases set applied=b->'grant' where id=(b->>'lease')::uuid;end if;return '{"ok":true}';
 elsif op='sweep' then
  perform 1 from acc_private.media_release where id for update;
  if (select last_sweep>now()-interval '45 seconds' from acc_private.media_release where id) then return '[]';end if;
  update acc_private.media_release set last_sweep=now() where id;
  for l in select * from acc_private.media_leases order by expires limit 100 loop
   ok:=l.expires>now() and (select enabled from acc_private.media_release where id);g:=null;
   if ok then
    begin
     perform set_config('request.jwt.claims',jsonb_build_object('sub',l.person,'session_id',l.session_id,'role','authenticated')::text,true);
     g:=acc_private.media_authorize(l.room);
     if exists(select 1 from acc_private.media_leases other where other.room=l.room and other.person<>l.person and acc_private.blocked(l.person,other.person)) then ok:=false;end if;
    exception when others then ok:=false;end;
   end if;
   items:=items||jsonb_build_array(jsonb_build_object('id',l.id,'room','acc-'||l.room::text,'remove',not ok,'grant',g,'changed',l.applied is distinct from g));
  end loop;
  perform set_config('request.jwt.claims',coalesce(original,''),true);return items;
 else raise exception 'Unknown service operation';end if;
end $$;
create function public.acc_media_service(op text,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select acc_private.media_service(op,b)$$;
revoke all on function public.acc_media_service(text,jsonb),acc_private.media_service(text,jsonb) from public,anon,authenticated;
grant usage on schema acc_private to service_role;
grant execute on function public.acc_media_service(text,jsonb),acc_private.media_service(text,jsonb) to service_role;
commit;
