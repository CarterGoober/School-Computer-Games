begin;
create table acc_private.grades(person uuid primary key references auth.users on delete cascade,grade smallint check(grade between 9 and 12),requested smallint check(requested between 9 and 12));
insert into acc_private.grades(person) select id from public.acc_profiles;
create table acc_private.owner_setup(id boolean primary key default true check(id),candidate uuid not null references auth.users,code_hash text not null,expires timestamptz not null,owner_id uuid references auth.users,claimed_at timestamptz);
create table acc_private.channel_settings(room uuid primary key references public.acc_rooms on delete cascade,grade smallint check(grade between 9 and 12),announcement boolean not null default false,archived boolean not null default false);
insert into acc_private.channel_settings(room,grade,announcement) select id,case name when 'freshmen' then 9 when 'sophomores' then 10 when 'juniors' then 11 when 'seniors' then 12 end,name='announcements' from public.acc_rooms where kind='school';
create table acc_private.moderators(person uuid primary key references auth.users on delete cascade,permissions jsonb not null default '{"reports":true,"messages":true,"mute":true,"ban":false,"announcements":false}',muted_until timestamptz);
create table acc_private.mutes(person uuid primary key references auth.users on delete cascade,until_at timestamptz not null);
create table acc_private.mod_invitations(id uuid primary key default gen_random_uuid(),target uuid not null references auth.users on delete cascade,code_hash text not null,permissions jsonb not null,expires timestamptz not null default now()+interval '1 day',accepted boolean not null default false);
create table acc_private.community(id boolean primary key default true check(id),chat_paused boolean default false,groups_enabled boolean default true);
insert into acc_private.community values(true,false,true);
create function acc_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$select acc_private.verified() and exists(select 1 from acc_private.owner_setup where owner_id=auth.uid())$$;
create function acc_private.can(permission text) returns boolean language sql stable security definer set search_path='' as $$select acc_private.is_owner() or (acc_private.verified() and exists(select 1 from acc_private.moderators m join public.acc_profiles p on p.id=m.person where m.person=auth.uid() and p.role='moderator' and coalesce((m.permissions->>$1)::boolean,false)))$$;
create or replace function acc_private.access(r uuid) returns boolean language sql stable security definer set search_path='' as $$select acc_private.verified() and exists(select 1 from public.acc_rooms a left join acc_private.channel_settings c on c.room=a.id where a.id=r and not coalesce(c.archived,false) and (a.kind='school' and (c.grade is null or acc_private.is_owner() or c.grade=(select grade from acc_private.grades where person=auth.uid())) or a.kind<>'school' and exists(select 1 from public.acc_members where room=r and person=auth.uid())))$$;
-- Preserve registration safeguards, then persist the initial grade request exactly once.
alter function acc_private.register() rename to register_password_test;
create function acc_private.register() returns trigger language plpgsql security definer set search_path='' as $$declare g smallint;begin
 -- The original trigger continues enforcing invitations, unique names and identity binding.
 return new;
end $$;
-- A separate AFTER INSERT trigger runs after acc_register, which already creates the profile.
create function acc_private.assign_grade() returns trigger language plpgsql security definer set search_path='' as $$declare g smallint;begin
 if coalesce(new.raw_user_meta_data->>'grade','') !~ '^(9|10|11|12)$' then raise exception 'Choose grade 9, 10, 11 or 12';end if;
 g:=(new.raw_user_meta_data->>'grade')::smallint;insert into acc_private.grades(person,grade) values(new.id,g);return new;
end $$;
create trigger acc_z_assign_grade after insert on auth.users for each row execute function acc_private.assign_grade();
-- Drop the unused placeholder; the existing trigger retains the renamed original function's OID.
drop function acc_private.register();
alter function acc_private.call(text,jsonb) rename to legacy_call;
revoke all on function acc_private.legacy_call(text,jsonb) from authenticated,anon,public;
create function acc_private.manage(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t uuid:=nullif(b->>'target','')::uuid;r uuid:=nullif(b->>'room','')::uuid;result jsonb;code text;n text;g smallint;cfg acc_private.channel_settings;entry acc_private.mod_invitations;
begin
 if not acc_private.verified() then raise exception 'Approved authenticated account required';end if;
 perform 1 from public.acc_profiles where id=u for no key update;
 if length(b::text)>12000 then raise exception 'Request too large';end if;
 if op='claimOwner' then
  perform 1 from acc_private.owner_setup where id for update;
  if not exists(select 1 from acc_private.owner_setup where id and candidate=u and owner_id is null and expires>now() and code_hash=encode(extensions.digest(coalesce(b->>'code',''),'sha256'),'hex')) then raise exception 'Owner setup unavailable or invalid for this account';end if;
  update acc_private.owner_setup set owner_id=u,claimed_at=now(),code_hash=repeat('0',64) where id;update public.acc_profiles set role='admin' where id=u;
 elsif op='requestGrade' then
  g:=(b->>'grade')::smallint;if g is null or g not between 9 and 12 then raise exception 'Invalid grade';end if;
  insert into acc_private.grades(person,requested) values(u,g) on conflict(person) do update set requested=excluded.requested;
 elsif op='adminSnapshot' then
  if not acc_private.is_owner() then raise exception 'Owner only';end if;
  return jsonb_build_object('users',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select p.id,p.username,p.role,p.suspended,g.grade,g.requested,m.permissions from public.acc_profiles p left join acc_private.grades g on g.person=p.id left join acc_private.moderators m on m.person=p.id order by p.username)x),'channels',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select a.id,a.name,a.category,c.grade,c.announcement,c.archived from public.acc_rooms a left join acc_private.channel_settings c on c.room=a.id where a.kind='school' order by a.name)x),'community',(select to_jsonb(c) from acc_private.community c where id));
 elsif op in ('setGrade','channelSave','channelArchive','setCommunity','inviteModerator','setModerator','revokeModerator') then
  if not acc_private.is_owner() then raise exception 'Owner only';end if;
  if op='setGrade' then
   g:=(b->>'grade')::smallint;if g is null or g not between 9 and 12 then raise exception 'Invalid grade';end if;
   if not exists(select 1 from public.acc_profiles where id=t) then raise exception 'Unknown account';end if;
   insert into acc_private.grades(person,grade) values(t,g) on conflict(person) do update set grade=excluded.grade,requested=null;
  elsif op='channelSave' then
   n:=btrim(b->>'name');if length(n) not between 1 and 50 then raise exception 'Channel name must be 1–50 characters';end if;
   g:=nullif(b->>'grade','')::smallint;if g is not null and g not between 9 and 12 then raise exception 'Invalid grade';end if;
   if r is null then insert into public.acc_rooms(kind,name,category) values('school',n,case when g is null then 'School' else 'Grades' end) returning id into r;
   else update public.acc_rooms set name=n,category=case when g is null then case when b->>'category'='Subjects' then 'Subjects' else 'School' end else 'Grades' end where id=r and kind='school';if not found then raise exception 'Unknown school channel';end if;end if;
   insert into acc_private.channel_settings(room,grade,announcement) values(r,g,(n='announcements' or coalesce((b->>'announcement')::boolean,false))) on conflict(room) do update set grade=excluded.grade,announcement=excluded.announcement;
  elsif op='channelArchive' then
   if not exists(select 1 from public.acc_rooms where id=r and kind='school' and name=b->>'confirm') then raise exception 'Type the channel name to confirm';end if;
   insert into acc_private.channel_settings(room,archived) values(r,coalesce((b->>'archived')::boolean,true)) on conflict(room) do update set archived=excluded.archived;
  elsif op='setCommunity' then update acc_private.community set chat_paused=(b->>'chat_paused')::boolean,groups_enabled=(b->>'groups_enabled')::boolean where id;
  elsif op='inviteModerator' then
   -- Email is a lookup request, never evidence of identity. Lock invitation to the existing Auth UUID.
   select id into t from auth.users where lower(email)=lower(b->>'email');if t is null then raise exception 'That person must register first';end if;
   if t=u then raise exception 'Owner already has all permissions';end if;
   code:=encode(extensions.gen_random_bytes(32),'hex');
   insert into acc_private.mod_invitations(target,code_hash,permissions) values(t,encode(extensions.digest(code,'sha256'),'hex'),'{"reports":true,"messages":true,"mute":true,"ban":false,"announcements":false}');
   return jsonb_build_object('code',code,'target',t,'username',(select username from public.acc_profiles where id=t));
  elsif op='revokeModerator' then
   if t=u then raise exception 'Owner cannot be demoted';end if;
   delete from acc_private.moderators where person=t;update public.acc_profiles set role='student' where id=t;delete from acc_private.mod_invitations where target=t;
  else
   if t=u or not exists(select 1 from acc_private.moderators where person=t) then raise exception 'No accepted moderator account';end if;
   if jsonb_typeof(b->'permissions')<>'object' or exists(select 1 from jsonb_object_keys(b->'permissions') k where k not in ('reports','messages','mute','ban','announcements')) then raise exception 'Invalid permissions';end if;
   update acc_private.moderators set permissions=b->'permissions' where person=t;
  end if;
 elsif op='acceptModerator' then
  select * into entry from acc_private.mod_invitations where target=u and not accepted and expires>now() and code_hash=encode(extensions.digest(coalesce(b->>'code',''),'sha256'),'hex') for update;
  if not found then raise exception 'Invitation invalid, expired, or belongs to another account';end if;
  insert into acc_private.moderators(person,permissions) values(u,entry.permissions) on conflict(person) do update set permissions=excluded.permissions;
  update public.acc_profiles set role='moderator' where id=u;update acc_private.mod_invitations set accepted=true,code_hash=repeat('0',64) where id=entry.id;
 elsif op='muteUser' then
  if not acc_private.can('mute') or t=u or exists(select 1 from acc_private.owner_setup where owner_id=t) or exists(select 1 from public.acc_profiles where id=t and role<>'student') then raise exception 'Mute denied';end if;
  insert into acc_private.mutes(person,until_at) values(t,now()+make_interval(mins=>least(1440,greatest(0,coalesce((b->>'minutes')::integer,10))))) on conflict(person) do update set until_at=excluded.until_at;
 elsif op='role' then raise exception 'Use owner moderator invitations and permissions';
 else
  if op='send' then
   if (select chat_paused from acc_private.community where id) and not acc_private.is_owner() then raise exception 'Chat is paused by the owner';end if;
   if exists(select 1 from acc_private.mutes where person=u and until_at>now()) then raise exception 'You are temporarily muted';end if;
   select * into cfg from acc_private.channel_settings where room=r;
   if (coalesce(cfg.announcement,false) or exists(select 1 from public.acc_rooms where id=r and name='announcements' and kind='school')) and not acc_private.can('announcements') then raise exception 'Announcement posting is owner-only unless explicitly granted';end if;
  end if;
  if op='group' and not (select groups_enabled from acc_private.community where id) then raise exception 'Group creation is disabled';end if;
  if op in ('reports','resolve') and not acc_private.can('reports') then raise exception 'Report permission required';end if;
  if op='suspend' and (not acc_private.can('ban') or exists(select 1 from acc_private.owner_setup where owner_id=t)) then raise exception 'Ban permission required; owner protected';end if;
  if op='adminPeople' and not (acc_private.can('reports') or acc_private.is_owner()) then raise exception 'Staff permission required';end if;
  if op='deleteMessage' and not acc_private.can('messages') and not exists(select 1 from public.acc_messages where id=(b->>'message')::bigint and author=u) then raise exception 'Message moderation permission required';end if;
  if op='deleteAccount' and acc_private.is_owner() then raise exception 'Owner account requires an operator transfer before deletion';end if;
  result:=acc_private.legacy_call(op,b);
  if op='bootstrap' then
   result:=result||jsonb_build_object('self',(result->'self')||jsonb_build_object('identity','Unverified test account','owner',acc_private.is_owner(),'grade',(select grade from acc_private.grades where person=u),'permissions',case when acc_private.is_owner() then '{"reports":true,"messages":true,"mute":true,"ban":true,"announcements":true}'::jsonb else coalesce((select permissions from acc_private.moderators where person=u),'{}') end));
   result:=jsonb_set(result,'{people}',coalesce((select jsonb_agg(x||jsonb_build_object('grade',(select grade from acc_private.grades where person=(x->>'id')::uuid))) from jsonb_array_elements(result->'people')x),'[]'));
   result:=jsonb_set(result,'{rooms}',coalesce((select jsonb_agg(x||jsonb_build_object('canPost',case when coalesce((select announcement from acc_private.channel_settings where room=(x->>'id')::uuid),false) then acc_private.can('announcements') else true end)) from jsonb_array_elements(result->'rooms')x),'[]'));
  end if;return result;
 end if;
 insert into acc_private.audit(actor,action,target) values(u,op,coalesce(t::text,r::text,'self'));return '{"ok":true}';
end $$;
create or replace function public.acc_call(op text,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select acc_private.manage(op,b)$$;
revoke all on function acc_private.is_owner(),acc_private.can(text),acc_private.assign_grade(),acc_private.manage(text,jsonb) from public,anon,authenticated;
grant execute on function acc_private.manage(text,jsonb) to authenticated;
alter table acc_private.grades enable row level security;
revoke all on acc_private.grades from public,anon,authenticated;
alter table acc_private.owner_setup enable row level security;
revoke all on acc_private.owner_setup from public,anon,authenticated;
alter table acc_private.channel_settings enable row level security;
revoke all on acc_private.channel_settings from public,anon,authenticated;
alter table acc_private.moderators enable row level security;
revoke all on acc_private.moderators from public,anon,authenticated;
alter table acc_private.mutes enable row level security;
revoke all on acc_private.mutes from public,anon,authenticated;
alter table acc_private.mod_invitations enable row level security;
revoke all on acc_private.mod_invitations from public,anon,authenticated;
alter table acc_private.community enable row level security;
revoke all on acc_private.community from public,anon,authenticated;
commit;
