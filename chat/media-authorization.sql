-- Phase 2 authorization candidate only. NOT APPLIED to production.
-- This grants no media token and does not enable browser capture or SFU connections.
begin;
create table acc_private.voice_channels(room uuid primary key references public.acc_rooms on delete cascade,capacity smallint not null default 8 check(capacity between 2 and 24),camera boolean not null default false,screen boolean not null default false);
alter table acc_private.voice_channels enable row level security;
revoke all on acc_private.voice_channels from public,anon,authenticated;
create function acc_private.media_authorize(r uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();s uuid;k text;cfg acc_private.voice_channels;mic boolean:=true;begin
 if not acc_private.server_pilot() then raise exception 'Approved media pilot account required';end if;
 select kind into k from public.acc_rooms where id=r;
 select * into cfg from acc_private.voice_channels where room=r;
 select server into s from acc_private.server_channels where room=r and kind='voice';
 if s is null and exists(select 1 from acc_private.server_channels where room=r) then raise exception 'Server text channels are not voice destinations';end if;
 if s is not null then
  if not acc_private.server_permission(s,'view',r) or not acc_private.server_permission(s,'join_voice',r) then raise exception 'Voice channel permission denied';end if;
  mic:=not exists(select 1 from acc_private.server_members where server=s and person=u and muted_until>now());
 elsif k='dm' then
  if not acc_private.access(r) or (select count(*) from public.acc_members where room=r)<>2 or not exists(select 1 from public.acc_members m join public.acc_friends f on f.status='accepted' and ((f.sender=u and f.recipient=m.person)or(f.recipient=u and f.sender=m.person)) where m.room=r and m.person<>u) then raise exception 'Consented private call unavailable';end if;
 elsif k='group' then
  if not acc_private.access(r) then raise exception 'Private call membership required';end if;
 elsif k='school' and cfg.room is not null then
  if not acc_private.access(r) then raise exception 'School grade voice access denied';end if;
 else raise exception 'Not an authorized voice destination';end if;
 if k in ('dm','group') and s is null and exists(select 1 from public.acc_members m where m.room=r and m.person<>u and (acc_private.blocked(u,m.person) or not acc_private.notice_recipient(m.person))) then raise exception 'Call contains an unavailable or blocked participant';end if;
 if exists(select 1 from acc_private.mutes where person=u and until_at>now()) then mic:=false;end if;
 return jsonb_build_object('identity',u,'room','acc-'||r::text,'capacity',coalesce(cfg.capacity,8),'subscribe',true,'microphone',mic,'camera',mic and coalesce(cfg.camera,false),'screen',mic and coalesce(cfg.screen,false));
end $$;
create function public.acc_media_authorize(room uuid) returns jsonb language sql stable security invoker set search_path='' as $$select acc_private.media_authorize(room)$$;
revoke all on function acc_private.media_authorize(uuid),public.acc_media_authorize(uuid) from public,anon,authenticated;
grant execute on function acc_private.media_authorize(uuid),public.acc_media_authorize(uuid) to authenticated;
commit;
