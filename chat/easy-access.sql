-- Automatic student admission and ordinary voice eligibility, after the user reported a passing two-account call.
begin;
alter table acc_private.media_release add column testing boolean not null default true;
update acc_private.media_release set enabled=true,testing=false where id;
create or replace function acc_private.test_access(person uuid,value text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from acc_private.launch l join acc_private.test_identities i on i.person=$1 where l.id and l.public_signup and l.password_testing and acc_private.school_email(value) and i.email_hash=encode(extensions.digest(lower(value),'sha256'),'hex'))$$;
create or replace function acc_private.verified() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users a join public.acc_profiles p on p.id=a.id where a.id=auth.uid() and not p.suspended and acc_private.school_email(a.email) and exists(select 1 from auth.sessions s where s.user_id=a.id and s.id::text=auth.jwt()->>'session_id'))$$;
create or replace function acc_private.notice_recipient(p uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users a join public.acc_profiles pr on pr.id=a.id where a.id=p and not pr.suspended and acc_private.school_email(a.email))$$;
create or replace function acc_private.server_pilot() returns boolean language sql stable security definer set search_path='' as $$select acc_private.verified()$$;
create function acc_private.media_available(p uuid) returns boolean language sql stable security definer set search_path='' as $$select acc_private.notice_recipient(p) and exists(select 1 from acc_private.media_release l where l.id and l.enabled)$$;
revoke all on function acc_private.media_available(uuid) from public,anon,authenticated;
-- Existing active-session, school-domain and suspension checks are preserved in verified().
-- Registration creates a normal profile and a bound identity; no approval or email metadata supplies roles.
create or replace function acc_private.media_authorize(r uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=auth.uid();s uuid;k text;cfg acc_private.voice_channels;mic boolean:=true;begin
 if not acc_private.verified() then raise exception 'Student session required';end if;
 if not acc_private.media_available(u) then raise exception 'Voice updates are being tested and are not publicly released yet';end if;
 select kind into k from public.acc_rooms where id=r;select * into cfg from acc_private.voice_channels where room=r;select server into s from acc_private.server_channels where room=r and kind='voice';
 if s is null and exists(select 1 from acc_private.server_channels where room=r) then raise exception 'Choose a server voice channel';end if;
 if s is not null then
  if not acc_private.server_permission(s,'view',r) or not acc_private.server_permission(s,'join_voice',r) then raise exception 'This private room is not available to you';end if;
  mic:=not exists(select 1 from acc_private.server_members where server=s and person=u and muted_until>now());
 elsif k='dm' then
  if not acc_private.access(r) or not exists(select 1 from public.acc_friends f join public.acc_members m on m.room=r and m.person<>u where f.status='accepted' and ((f.sender=u and f.recipient=m.person)or(f.recipient=u and f.sender=m.person))) then raise exception 'An accepted friendship is required';end if;
  if not exists(select 1 from public.acc_calls where room=r and status='accepted' and(caller=u or recipient=u)) then raise exception 'Your friend must accept the call first';end if;
 elsif k='group' then if not acc_private.access(r) then raise exception 'Private group membership required';end if;
 elsif k='school' then
  if not acc_private.access(r) then raise exception 'This grade or channel is not available';end if;
  if exists(select 1 from acc_private.channel_settings where room=r and announcement) then raise exception 'Announcements are text-only and owner-posted';end if;
 else raise exception 'Voice channel unavailable';end if;
 if k in('dm','group') and s is null and exists(select 1 from public.acc_members m where room=r and person<>u and(acc_private.blocked(u,m.person)or not acc_private.notice_recipient(m.person))) then raise exception 'A blocked or unavailable participant is in this call';end if;
 if exists(select 1 from acc_private.mutes where person=u and until_at>now()) then mic:=false;end if;
 return jsonb_build_object('identity',u,'room','acc-'||r::text,'capacity',coalesce(cfg.capacity,8),'subscribe',true,'microphone',mic,'camera',mic and coalesce(cfg.camera,true),'screen',mic and coalesce(cfg.screen,true));
end $$;
do $$declare d text;begin
 d:=pg_get_functiondef('acc_private.media_session(text,uuid,jsonb)'::regprocedure);
 d:=replace(d,$a$if op='status' then return jsonb_build_object('enabled',(select enabled from acc_private.media_release where id),'pilot',acc_private.server_pilot());end if;$a$,$b$if op='status' then return jsonb_build_object('enabled',acc_private.media_available(u),'pilot',acc_private.verified(),'released',(select enabled from acc_private.media_release where id),'eligible',acc_private.verified());end if;$b$);

 d:=replace(d,'if not (select enabled from acc_private.media_release where id) then',$a$if not acc_private.media_available(u) then$a$);
 d:=replace(d,$a$if not acc_private.is_owner() then raise exception 'Owner only';end if;
  if not exists(select 1 from public.acc_rooms where id=r)$a$,$b$if not acc_private.is_owner() and not exists(select 1 from acc_private.server_channels where room=r and acc_private.server_permission(server,'manage_channels')) then raise exception 'Room owner or channel manager required';end if;
  if not exists(select 1 from public.acc_rooms where id=r)$b$);execute d;
 d:=pg_get_functiondef('acc_private.media_service(text,jsonb)'::regprocedure);d:=replace(d,'l.expires>now() and (select enabled from acc_private.media_release where id)','l.expires>now() and acc_private.media_available(l.person)');execute d;
 -- Remove obsolete manual-admission actions; suspensions remain the way to revoke account access.
 d:=pg_get_functiondef('acc_private.manage(text,jsonb)'::regprocedure);d:=replace(d,'Unverified test account','Unverified account');execute d;
 d:=pg_get_functiondef('acc_private.admission(text,jsonb)'::regprocedure);d:=replace(d,$a$if op='registrationStatus' then$a$,$b$if op in('approveRegistration','revokeRegistration') then raise exception 'Manual admission is removed. Use suspension for moderation';end if;if op='pendingRegistrations' then if not acc_private.is_owner() then raise exception 'Owner only';end if;return '[]';end if;if op='registrationStatus' then$b$);execute d;
end $$;
commit;
