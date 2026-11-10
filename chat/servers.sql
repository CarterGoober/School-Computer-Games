-- Phase 1 private pilot. Additive; enabled only after independently authenticated browser tests.
begin;
create table acc_private.social_release(id boolean primary key default true check(id),enabled boolean not null default false);
insert into acc_private.social_release values(true,false);
create table acc_private.social_testers(person uuid primary key references public.acc_profiles on delete cascade);
create table public.acc_servers(id uuid primary key default gen_random_uuid(),owner uuid not null references public.acc_profiles on delete cascade,name text not null check(length(name) between 1 and 60),description text not null default '' check(length(description)<=500),icon text not null default 'orbit' check(icon in ('orbit','bolt','leaf','peak','star')),color text not null default '#8be6dc' check(color ~ '^#[0-9a-fA-F]{6}$'),visibility text not null default 'private' check(visibility in ('public','unlisted','private')),category text not null default 'Social' check(category in ('Gaming','School','Homework','Sports','Clubs','Social')),approved boolean not null default false,featured boolean not null default false,disabled boolean not null default false,created_at timestamptz not null default now(),active_at timestamptz not null default now());
create table acc_private.server_members(server uuid references public.acc_servers on delete cascade,person uuid references public.acc_profiles on delete cascade,banned boolean not null default false,muted_until timestamptz,primary key(server,person));
create table acc_private.server_roles(id uuid primary key default gen_random_uuid(),server uuid not null references public.acc_servers on delete cascade,name text not null check(length(name) between 1 and 40),color text not null default '#8be6dc' check(color ~ '^#[0-9a-fA-F]{6}$'),permissions jsonb not null default '{"view":true,"post":true,"join_voice":true}',everyone boolean not null default false);
create unique index acc_server_everyone on acc_private.server_roles(server) where everyone;
create table acc_private.server_role_members(role uuid references acc_private.server_roles on delete cascade,person uuid references public.acc_profiles on delete cascade,primary key(role,person));
create table acc_private.server_categories(id uuid primary key default gen_random_uuid(),server uuid not null references public.acc_servers on delete cascade,name text not null check(length(name) between 1 and 50),position integer not null default 0);
create table acc_private.server_channels(room uuid primary key references public.acc_rooms on delete cascade,server uuid not null references public.acc_servers on delete cascade,category uuid references acc_private.server_categories on delete set null,kind text not null default 'text' check(kind in ('text','voice')),position integer not null default 0);
create table acc_private.server_channel_rules(room uuid references acc_private.server_channels on delete cascade,role uuid references acc_private.server_roles on delete cascade,permissions jsonb not null,primary key(room,role));
create table acc_private.server_invites(id uuid primary key default gen_random_uuid(),server uuid references public.acc_servers on delete cascade,code_hash text not null unique,expires timestamptz not null default now()+interval '1 day',remaining integer not null default 1 check(remaining between 0 and 100),revoked boolean not null default false);
create function acc_private.server_delete_rooms() returns trigger language plpgsql security definer set search_path='' as $$begin delete from public.acc_rooms where id in(select room from acc_private.server_channels where server=old.id);return old;end $$;
create trigger acc_server_delete_rooms before delete on public.acc_servers for each row execute function acc_private.server_delete_rooms();
revoke all on function acc_private.server_delete_rooms() from public,anon,authenticated;
create index acc_server_directory on public.acc_servers(category,active_at desc) where approved and visibility='public' and not disabled;
do $$declare t text;begin foreach t in array array['social_testers','social_release','server_members','server_roles','server_role_members','server_categories','server_channels','server_channel_rules','server_invites'] loop execute format('alter table acc_private.%I enable row level security',t);execute format('revoke all on acc_private.%I from public,anon,authenticated',t);end loop;end $$;
alter table public.acc_servers enable row level security;
revoke all on public.acc_servers from public,anon,authenticated;
create function acc_private.server_pilot() returns boolean language sql stable security definer set search_path='' as $$select acc_private.verified() and (acc_private.is_owner() or exists(select 1 from acc_private.social_release where id and enabled) or exists(select 1 from acc_private.social_testers where person=auth.uid()))$$;
create function acc_private.server_permission(s uuid,p text,r uuid default null) returns boolean language plpgsql stable security definer set search_path='' as $$declare u uuid:=auth.uid();begin
 if not acc_private.server_pilot() or exists(select 1 from public.acc_servers where id=s and disabled) or not exists(select 1 from public.acc_servers where id=s) then return false;end if;
 if acc_private.is_owner() then return true;end if;
 if not exists(select 1 from acc_private.server_members where server=s and person=u and not banned) then return false;end if;
 if exists(select 1 from public.acc_servers where id=s and owner=u) then return true;end if;
 if p='post' and exists(select 1 from acc_private.server_members where server=s and person=u and muted_until>now()) then return false;end if;
 if r is not null and not exists(select 1 from acc_private.server_channels where room=r and server=s) then return false;end if;
 if r is not null and exists(select 1 from acc_private.server_channel_rules c join acc_private.server_roles ro on ro.id=c.role where c.room=r and ro.server=s and (ro.everyone or exists(select 1 from acc_private.server_role_members where role=ro.id and person=u)) and c.permissions->>p='false') then return false;end if;
 return exists(select 1 from acc_private.server_roles ro left join acc_private.server_channel_rules c on c.role=ro.id and c.room=r where ro.server=s and (ro.everyone or exists(select 1 from acc_private.server_role_members where role=ro.id and person=u)) and coalesce(c.permissions->>p,ro.permissions->>p,'false')='true');
end $$;
create policy server_read on public.acc_servers for select to authenticated using(acc_private.server_pilot() and ((visibility='public' and approved and not disabled) or acc_private.server_permission(id,'view')));
grant select on public.acc_servers to authenticated;
-- Preserve the exact school/grade checks; mapped server channels use additional trusted membership/role checks.
create or replace function acc_private.access(r uuid) returns boolean language sql stable security definer set search_path='' as $$select case when exists(select 1 from acc_private.server_channels where room=r) then exists(select 1 from acc_private.server_channels where room=r and kind='text' and acc_private.server_permission(server,'view',r)) else acc_private.verified() and exists(select 1 from public.acc_rooms a left join acc_private.channel_settings c on c.room=a.id where a.id=r and not coalesce(c.archived,false) and (a.kind='school' and (c.grade is null or acc_private.is_owner() or c.grade=(select grade from acc_private.grades where person=auth.uid())) or a.kind<>'school' and exists(select 1 from public.acc_members where room=r and person=auth.uid()))) end$$;
create function acc_private.servers(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s uuid:=nullif(b->>'server','')::uuid;r uuid:=nullif(b->>'room','')::uuid;t uuid:=nullif(b->>'target','')::uuid;rid uuid;cat uuid;code text;entry acc_private.server_invites;result jsonb;perms jsonb;begin
 if not acc_private.server_pilot() then raise exception 'Student server pilot is not enabled for this account';end if;
 if length(b::text)>12000 then raise exception 'Request too large';end if;
 perform 1 from public.acc_profiles where id=u for no key update;
 if op='serverPilotTester' then
  if not acc_private.is_owner() or not acc_private.notice_recipient(t) then raise exception 'Owner may enable only an already approved account ID';end if;
  if coalesce((b->>'enabled')::boolean,false) then insert into acc_private.social_testers values(t) on conflict do nothing;else delete from acc_private.social_testers where person=t;end if;
  insert into acc_private.audit(actor,action,target) values(u,op,t::text);return '{"ok":true}';
 elsif op='serverDirectory' then return(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select a.*, (select count(*) from acc_private.server_members where server=a.id and not banned) member_count from public.acc_servers a where a.visibility='public' and a.approved and not a.disabled and (coalesce(b->>'search','')='' or a.name ilike '%'||left(b->>'search',60)||'%') and (coalesce(b->>'category','')='' or a.category=b->>'category') order by a.featured desc,case when b->>'sort'='newest' then a.created_at else a.active_at end desc limit 100)x);
 elsif op='serverReviewQueue' then
  if not acc_private.is_owner() then raise exception 'Platform owner only';end if;
  return(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select * from public.acc_servers where visibility='public' and not approved and not disabled order by created_at limit 100)x);
 elsif op='myServers' then return(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select a.* from public.acc_servers a where exists(select 1 from acc_private.server_members where server=a.id and person=u and not banned) and not a.disabled order by a.active_at desc)x);
 elsif op='serverCreate' then
  if (select count(*) from acc_private.audit where actor=u and action='serverCreate' and created_at>now()-interval '1 hour')>=3 then raise exception 'Please wait: at most three server creations per hour; there is no total server limit';end if;
  insert into public.acc_servers(owner,name,description,icon,color,visibility,category) values(u,btrim(b->>'name'),coalesce(b->>'description',''),coalesce(b->>'icon','orbit'),coalesce(b->>'color','#8be6dc'),coalesce(b->>'visibility','private'),coalesce(b->>'category','Social')) returning id into s;
  insert into acc_private.server_members(server,person) values(s,u);insert into acc_private.server_roles(server,name,everyone) values(s,'Everyone',true);
  insert into public.acc_rooms(kind,name,owner) values('group','general',u) returning id into r;insert into acc_private.server_channels(room,server) values(r,s);insert into public.acc_members(room,person) values(r,u);
 elsif op='serverJoin' then
  perform 1 from public.acc_servers where id=s for update;
  if exists(select 1 from acc_private.server_members where server=s and person=u and banned) then raise exception 'You are banned from this server';end if;
  if not exists(select 1 from public.acc_servers where id=s and visibility='public' and approved and not disabled) then
   select * into entry from acc_private.server_invites where server=s and code_hash=encode(extensions.digest(coalesce(b->>'code',''),'sha256'),'hex') and expires>now() and remaining>0 and not revoked for update;
   if not found or exists(select 1 from public.acc_servers where id=s and disabled) then raise exception 'Invalid, expired or revoked server invitation';end if;
   if not exists(select 1 from acc_private.server_members where server=s and person=u and not banned) then update acc_private.server_invites set remaining=remaining-1 where id=entry.id;end if;
  end if;
  insert into acc_private.server_members(server,person) values(s,u) on conflict do nothing;
 elsif op='serverSnapshot' then
  if not acc_private.server_permission(s,'view') then raise exception 'Server access denied';end if;
  return jsonb_build_object('server',(select to_jsonb(a) from public.acc_servers a where id=s),'manage',acc_private.server_permission(s,'manage_channels'),'rolesManage',acc_private.server_permission(s,'manage_roles'),'moderate',acc_private.server_permission(s,'moderate'),'categories',(select coalesce(jsonb_agg(to_jsonb(c) order by position,id),'[]') from acc_private.server_categories c where server=s),'channels',(select coalesce(jsonb_agg(to_jsonb(x) order by x.position,x.room),'[]') from(select c.*,a.name,acc_private.server_permission(s,'post',c.room) can_post from acc_private.server_channels c join public.acc_rooms a on a.id=c.room where c.server=s and acc_private.server_permission(s,'view',c.room))x),'roles',(select coalesce(jsonb_agg(to_jsonb(ro)),'[]') from acc_private.server_roles ro where server=s),'members',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select m.person,p.username,m.banned,m.muted_until,(select coalesce(jsonb_agg(role),'[]') from acc_private.server_role_members where person=m.person and role in(select id from acc_private.server_roles where server=s)) roles from acc_private.server_members m join public.acc_profiles p on p.id=m.person where m.server=s and (not m.banned or acc_private.server_permission(s,'moderate')))x));
 else
  if op in ('serverSave','serverDelete','serverApprove','serverDisable') then
   if op in ('serverApprove','serverDisable') then if not acc_private.is_owner() then raise exception 'Platform owner only';end if;
   elsif not acc_private.is_owner() and not exists(select 1 from public.acc_servers where id=s and owner=u) then raise exception 'Server owner only';end if;
   if op='serverSave' then update public.acc_servers set name=btrim(b->>'name'),description=coalesce(b->>'description',''),icon=b->>'icon',color=b->>'color',visibility=b->>'visibility',category=b->>'category',approved=false,featured=false where id=s;
   elsif op='serverDelete' then
    if not exists(select 1 from public.acc_servers where id=s and name=b->>'confirm') then raise exception 'Type the server name to confirm deletion';end if;
    delete from public.acc_rooms where id in(select room from acc_private.server_channels where server=s);delete from public.acc_servers where id=s;
   elsif op='serverApprove' then update public.acc_servers set approved=coalesce((b->>'approved')::boolean,false),featured=coalesce((b->>'featured')::boolean,false) where id=s;
   else update public.acc_servers set disabled=coalesce((b->>'disabled')::boolean,true) where id=s;end if;
  elsif op in ('serverChannelSave','serverChannelDelete','serverChannelReorder','serverCategorySave','serverCategoryDelete') then
   if not acc_private.server_permission(s,'manage_channels') then raise exception 'Manage channels permission required';end if;
   if (select count(*) from acc_private.audit where actor=u and action in ('serverChannelSave','serverCategorySave') and created_at>now()-interval '1 minute')>=20 then raise exception 'Please slow down channel changes';end if;
   cat:=nullif(b->>'category','')::uuid;
   if cat is not null and not exists(select 1 from acc_private.server_categories where id=cat and server=s) then raise exception 'Invalid category';end if;
   if op='serverChannelReorder' then
    if jsonb_typeof(b->'order')<>'array' or jsonb_array_length(b->'order')<>(select count(*) from acc_private.server_channels where server=s) or (select count(distinct value) from jsonb_array_elements_text(b->'order'))<>jsonb_array_length(b->'order') or exists(select 1 from jsonb_array_elements_text(b->'order') x where not exists(select 1 from acc_private.server_channels where room=x.value::uuid and server=s)) then raise exception 'Invalid channel order';end if;
    update acc_private.server_channels c set position=x.n from(select value::uuid id,ordinality::integer n from jsonb_array_elements_text(b->'order') with ordinality)x where c.room=x.id and c.server=s;
    update acc_private.server_channels set category=cat where room=r and server=s;
   elsif op='serverCategorySave' then if cat is null then insert into acc_private.server_categories(server,name,position) values(s,b->>'name',coalesce((b->>'position')::integer,0));else update acc_private.server_categories set name=b->>'name',position=coalesce((b->>'position')::integer,0) where id=cat;end if;
   elsif op='serverCategoryDelete' then delete from acc_private.server_categories where id=cat and server=s;
   else
    if r is not null and not exists(select 1 from acc_private.server_channels where room=r and server=s) then raise exception 'Channel not in this server';end if;
    if op='serverChannelDelete' then delete from public.acc_rooms where id=r;
    elsif r is null then insert into public.acc_rooms(kind,name,owner) values('group',b->>'name',u) returning id into r;insert into acc_private.server_channels(room,server,category,kind,position) values(r,s,cat,coalesce(b->>'kind','text'),coalesce((b->>'position')::integer,0));
    else update public.acc_rooms set name=b->>'name' where id=r;update acc_private.server_channels set category=cat,kind=coalesce(b->>'kind','text'),position=coalesce((b->>'position')::integer,0) where room=r;end if;
   end if;
  elsif op in ('serverRoleSave','serverRoleDelete','serverRoleAssign','serverChannelRule') then
   if not acc_private.server_permission(s,'manage_roles') then raise exception 'Manage roles permission required';end if;
   -- Role delegation is reserved to server owner/platform owner; delegated role managers cannot escalate themselves.
   if not acc_private.is_owner() and not exists(select 1 from public.acc_servers where id=s and owner=u) then raise exception 'Only the server owner can delegate roles';end if;
   rid:=nullif(b->>'role','')::uuid;perms:=coalesce(b->'permissions','{}');
   if jsonb_typeof(perms)<>'object' or exists(select 1 from jsonb_each(perms)x where x.key not in ('view','post','join_voice','manage_channels','manage_roles','moderate','invite') or jsonb_typeof(x.value)<>'boolean') then raise exception 'Invalid server permissions';end if;
   if rid is not null and not exists(select 1 from acc_private.server_roles where id=rid and server=s) then raise exception 'Role not in server';end if;
   if op='serverRoleSave' then if rid is null then insert into acc_private.server_roles(server,name,color,permissions) values(s,b->>'name',b->>'color',perms);else update acc_private.server_roles set name=b->>'name',color=b->>'color',permissions=perms where id=rid;end if;
   elsif op='serverRoleDelete' then delete from acc_private.server_roles where id=rid and not everyone;
   elsif op='serverRoleAssign' then
    if not exists(select 1 from acc_private.server_members where server=s and person=t and not banned) then raise exception 'Target is not a member';end if;
    if coalesce((b->>'enabled')::boolean,true) then insert into acc_private.server_role_members values(rid,t) on conflict do nothing;else delete from acc_private.server_role_members where role=rid and person=t;end if;
   else if not exists(select 1 from acc_private.server_channels where room=r and server=s) then raise exception 'Channel not in server';end if;insert into acc_private.server_channel_rules values(r,rid,perms) on conflict(room,role) do update set permissions=excluded.permissions;end if;
  elsif op='serverInvite' then
   if not acc_private.server_permission(s,'invite') then raise exception 'Invite permission required';end if;
   code:=encode(extensions.gen_random_bytes(32),'hex');insert into acc_private.server_invites(server,code_hash,remaining) values(s,encode(extensions.digest(code,'sha256'),'hex'),least(100,greatest(1,coalesce((b->>'uses')::integer,1)))) returning id into rid;
   return jsonb_build_object('id',rid,'code',code,'server',s,'expires',now()+interval '1 day');
  elsif op='serverInviteRevoke' then if not acc_private.server_permission(s,'invite') then raise exception 'Invite permission required';end if;update acc_private.server_invites set revoked=true where id=(b->>'invite')::uuid and server=s;
  elsif op='serverModerate' then
   if not acc_private.server_permission(s,'moderate') or exists(select 1 from public.acc_servers where id=s and owner=t) or exists(select 1 from acc_private.owner_setup where owner_id=t) then raise exception 'Moderation denied; owner protected';end if;
   update acc_private.server_members set banned=case when b?'banned' then (b->>'banned')::boolean else banned end,muted_until=case when b?'minutes' then now()+make_interval(mins=>least(1440,greatest(0,(b->>'minutes')::integer))) else muted_until end where server=s and person=t;
  elsif op='serverLeave' then
   if exists(select 1 from public.acc_servers where id=s and owner=u) then raise exception 'Owner must delete the server or arrange ownership transfer';end if;
   delete from acc_private.server_members where server=s and person=u and not banned;delete from acc_private.server_role_members where person=u and role in(select id from acc_private.server_roles where server=s);
  else raise exception 'Unknown server operation';end if;
 end if;
 insert into acc_private.audit(actor,action,target) values(u,op,s::text);return jsonb_build_object('ok',true,'server',s,'room',r);
end $$;
create function acc_private.social_dispatch(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare s uuid;r uuid:=nullif(b->>'room','')::uuid;result jsonb;begin
 if op in ('registrationStatus','pendingRegistrations','approveRegistration','revokeRegistration','deletePendingRegistration') then return acc_private.admission(op,b);end if;
 if not acc_private.verified() then raise exception 'Approved authenticated account required';end if;
 if op like 'server%' or op='myServers' then return acc_private.servers(op,b);end if;
 select server into s from acc_private.server_channels where room=r;
 if s is not null then
  if op='send' and not acc_private.server_permission(s,'post',r) then raise exception 'Channel posting permission denied';end if;
  if op in ('invite','remove','rename','leave') then raise exception 'Use server membership/channel settings';end if;
 end if;
 if op='deleteMessage' then
  select c.server into s from public.acc_messages m join acc_private.server_channels c on c.room=m.room where m.id=(b->>'message')::bigint;
  if s is not null and acc_private.server_permission(s,'moderate') and acc_private.access((select room from public.acc_messages where id=(b->>'message')::bigint)) then update public.acc_messages set body='',deleted=true where id=(b->>'message')::bigint;delete from public.acc_reactions where message=(b->>'message')::bigint;insert into acc_private.audit(actor,action,target) values(auth.uid(),op,b->>'message');return '{"ok":true}';end if;
 end if;
 if op in ('inboxSnapshot','noticeRead','noticesReadAll','inboxSettings','inboxRoom') then return acc_private.inbox(op,b);end if;
 if op in ('registrationStatus','pendingRegistrations','approveRegistration','revokeRegistration','deletePendingRegistration') then return acc_private.admission(op,b);end if;
 if op in ('listTesterInvites','createTesterInvite','revokeTesterInvite') then return acc_private.invitations(op,b);end if;
 result:=acc_private.manage_notifications(op,b);
 if op='bootstrap' then result:=jsonb_set(result,'{self,serverPilot}',to_jsonb(acc_private.server_pilot()));result:=jsonb_set(result,'{rooms}',coalesce((select jsonb_agg(x||case when exists(select 1 from acc_private.server_channels where room=(x->>'id')::uuid) then jsonb_build_object('server',(select server from acc_private.server_channels where room=(x->>'id')::uuid),'canModerate',acc_private.server_permission((select server from acc_private.server_channels where room=(x->>'id')::uuid),'moderate'),'canPost',acc_private.server_permission((select server from acc_private.server_channels where room=(x->>'id')::uuid),'post',(x->>'id')::uuid)) else '{}' end) from jsonb_array_elements(result->'rooms')x),'[]'));end if;
 return result;
end $$;
-- Server channels must not consume the existing private-group creation quota.
do $$declare definition text;begin
 definition:=pg_get_functiondef('acc_private.legacy_call(text,jsonb)'::regprocedure);
 if position('(select count(*) from public.acc_rooms where owner=u)>=10' in definition)=0 then raise exception 'Unexpected group quota implementation; review before applying';end if;
 definition:=replace(definition,'(select count(*) from public.acc_rooms where owner=u)>=10','(select count(*) from public.acc_rooms a where a.owner=u and not exists(select 1 from acc_private.server_channels c where c.room=a.id))>=10');
 execute definition;
end $$;
-- Pending registration status/deletion must remain accessible before admission.
create or replace function public.acc_call(op text,b jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select acc_private.social_dispatch(op,b)$$;
revoke all on function public.acc_call(text,jsonb),acc_private.server_pilot(),acc_private.server_permission(uuid,text,uuid),acc_private.servers(text,jsonb),acc_private.social_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function public.acc_call(text,jsonb),acc_private.social_dispatch(text,jsonb),acc_private.server_pilot(),acc_private.server_permission(uuid,text,uuid) to authenticated;
revoke execute on function acc_private.manage_notifications(text,jsonb) from authenticated;
-- Keep social_release.enabled=false for the owner-only pilot until independent browser tests pass.
commit;
