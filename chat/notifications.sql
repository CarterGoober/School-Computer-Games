-- Additive notification/inbox update after public-registration.sql. No historical event backfill.
begin;
create table public.acc_notifications(id bigint generated always as identity primary key,person uuid not null references public.acc_profiles on delete cascade,actor uuid references public.acc_profiles on delete cascade,kind text not null check(kind in ('dm','friend_request','friend_accepted','announcement')),room uuid references public.acc_rooms on delete cascade,message bigint references public.acc_messages on delete cascade,event_key text not null,created_at timestamptz not null default now(),read_at timestamptz,unique(person,event_key));
create index acc_notifications_person_recent on public.acc_notifications(person,id desc);
create index acc_notifications_unread on public.acc_notifications(person,id) where read_at is null;
create table public.acc_inbox_settings(person uuid primary key references public.acc_profiles on delete cascade,dms boolean not null default true,friends boolean not null default true,announcements boolean not null default true,sound boolean not null default false,revision bigint not null default 0);
create table public.acc_inbox_rooms(person uuid references public.acc_profiles on delete cascade,room uuid references public.acc_rooms on delete cascade,pinned boolean not null default false,muted boolean not null default false,primary key(person,room));
create function acc_private.notice_recipient(p uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users a join public.acc_profiles pr on pr.id=a.id where a.id=p and not pr.suspended and acc_private.school_email(a.email) and (acc_private.test_access(a.id,a.email) or (not exists(select 1 from acc_private.test_identities where person=a.id) and a.email_confirmed_at is not null and acc_private.enrollment_allowed(a.email))))$$;
create function acc_private.notice_visible(a uuid,r uuid,k text,m bigint) returns boolean language sql stable security definer set search_path='' as $$
 select acc_private.verified()
 and not exists(select 1 from public.acc_preferences where (blocked and ((person=auth.uid() and target=a) or(person=a and target=auth.uid()))) or (muted and person=auth.uid() and target=a))
 and not exists(select 1 from public.acc_inbox_rooms where person=auth.uid() and room=r and muted)
 and coalesce((select case when k='dm' then dms when k='announcement' then announcements else friends end from public.acc_inbox_settings where person=auth.uid()),true)
 and (case when k in ('dm','announcement') then acc_private.access(r) and exists(select 1 from public.acc_messages where id=m and room=r and not deleted) and (k='announcement' or exists(select 1 from public.acc_friends where status='accepted' and ((sender=auth.uid() and recipient=a)or(sender=a and recipient=auth.uid()))))
 when k='friend_request' then exists(select 1 from public.acc_friends where sender=a and recipient=auth.uid() and status='pending')
 else exists(select 1 from public.acc_friends where status='accepted' and ((sender=auth.uid() and recipient=a)or(sender=a and recipient=auth.uid()))) end)
$$;
alter table public.acc_notifications enable row level security;
alter table public.acc_inbox_settings enable row level security;
alter table public.acc_inbox_rooms enable row level security;
revoke all on public.acc_notifications,public.acc_inbox_settings,public.acc_inbox_rooms from public,anon,authenticated;
grant select on public.acc_notifications,public.acc_inbox_settings,public.acc_inbox_rooms to authenticated;
create policy own_notifications on public.acc_notifications for select to authenticated using(person=(select auth.uid()) and acc_private.notice_visible(actor,room,kind,message));
create policy own_inbox_settings on public.acc_inbox_settings for select to authenticated using(person=(select auth.uid()) and acc_private.verified());
create policy own_inbox_rooms on public.acc_inbox_rooms for select to authenticated using(person=(select auth.uid()) and acc_private.verified() and acc_private.access(room));
create function acc_private.touch_inbox(p uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.acc_profiles where id=p) then insert into public.acc_inbox_settings(person) values(p) on conflict(person) do update set revision=acc_inbox_settings.revision+1;end if;
end $$;
create function acc_private.emit_notice(p uuid,a uuid,k text,r uuid,m bigint,e text) returns void language plpgsql security definer set search_path='' as $$begin
 perform acc_private.touch_inbox(p);
 if p=a or not acc_private.notice_recipient(p) then return;end if;
 if exists(select 1 from public.acc_preferences where (blocked and ((person=p and target=a)or(person=a and target=p))) or (muted and person=p and target=a)) then return;end if;
 if exists(select 1 from public.acc_inbox_rooms where person=p and room=r and muted) then return;end if;
 if not coalesce((select case when k='dm' then dms when k='announcement' then announcements else friends end from public.acc_inbox_settings where person=p),true) then return;end if;
 insert into public.acc_notifications(person,actor,kind,room,message,event_key) values(p,a,k,r,m,e) on conflict(person,event_key) do nothing;
end $$;
create function acc_private.message_notice() returns trigger language plpgsql security definer set search_path='' as $$declare t uuid;kind text;cfg acc_private.channel_settings;begin
 perform acc_private.touch_inbox(new.author);
 select a.kind into kind from public.acc_rooms a where a.id=new.room;
 if kind='dm' then
  for t in select person from public.acc_members where room=new.room and person<>new.author loop
   if exists(select 1 from public.acc_friends where status='accepted' and ((sender=t and recipient=new.author)or(sender=new.author and recipient=t))) then perform acc_private.emit_notice(t,new.author,'dm',new.room,new.id,'message:'||new.id);end if;
  end loop;
 elsif kind='school' then
  select * into cfg from acc_private.channel_settings where room=new.room;
  if (coalesce(cfg.announcement,false) or exists(select 1 from public.acc_rooms where id=new.room and name='announcements')) and exists(select 1 from acc_private.owner_setup where owner_id=new.author) then
   for t in select p.id from public.acc_profiles p left join acc_private.grades g on g.person=p.id where cfg.grade is null or cfg.grade=g.grade or exists(select 1 from acc_private.owner_setup where owner_id=p.id) loop
    perform acc_private.emit_notice(t,new.author,'announcement',new.room,new.id,'message:'||new.id);
   end loop;
  end if;
 end if;return new;
end $$;
create trigger acc_message_notice after insert on public.acc_messages for each row execute function acc_private.message_notice();
create function acc_private.friend_notice() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='DELETE' then perform acc_private.touch_inbox(old.sender);perform acc_private.touch_inbox(old.recipient);return old;end if;
 perform acc_private.touch_inbox(new.sender);perform acc_private.touch_inbox(new.recipient);
 if tg_op='INSERT' and new.status='pending' then perform acc_private.emit_notice(new.recipient,new.sender,'friend_request',null,null,'friend_request:'||gen_random_uuid());
 elsif tg_op='UPDATE' and new.status='accepted' and old.status='pending' then perform acc_private.emit_notice(new.sender,new.recipient,'friend_accepted',null,null,'friend_accepted:'||gen_random_uuid());end if;return new;
end $$;
create trigger acc_friend_notice after insert or update of status or delete on public.acc_friends for each row execute function acc_private.friend_notice();
create function acc_private.notice_privacy_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform acc_private.touch_inbox(new.person);perform acc_private.touch_inbox(new.target);return new;
end $$;
create trigger acc_notice_privacy_change after insert or update on public.acc_preferences for each row execute function acc_private.notice_privacy_change();
create function acc_private.notice_message_deleted() returns trigger language plpgsql security definer set search_path='' as $$declare p uuid;begin
 if new.deleted is distinct from old.deleted then for p in select person from public.acc_notifications where message=new.id loop perform acc_private.touch_inbox(p);end loop;end if;return new;
end $$;
create trigger acc_notice_message_deleted after update of deleted on public.acc_messages for each row execute function acc_private.notice_message_deleted();
create function acc_private.notice_room_read() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.acc_notifications set read_at=now() where person=new.person and room=new.room and message<=new.last_read and read_at is null;return new;
end $$;
create trigger acc_notice_room_read after insert or update of last_read on public.acc_members for each row execute function acc_private.notice_room_read();
create function acc_private.inbox(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r uuid:=nullif(b->>'room','')::uuid;result jsonb;
begin
 if not acc_private.verified() then raise exception 'Approved authenticated account required';end if;
 if length(b::text)>2000 then raise exception 'Request too large';end if;
 if op='inboxSnapshot' then
  insert into public.acc_inbox_settings(person) values(u) on conflict do nothing;
  delete from public.acc_notifications where person=u and created_at<now()-interval '90 days';
  return jsonb_build_object('settings',(select to_jsonb(s)-'person' from public.acc_inbox_settings s where person=u),
   'unread',(select count(*) from public.acc_notifications where person=u and read_at is null and acc_private.notice_visible(actor,room,kind,message)),
   'notices',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]') from(select n.id,n.actor,n.kind,n.room,n.message,n.created_at,n.read_at,p.username from public.acc_notifications n left join public.acc_profiles p on p.id=n.actor where n.person=u and acc_private.notice_visible(n.actor,n.room,n.kind,n.message) order by n.id desc limit 100)x),
   'dms',(select coalesce(jsonb_agg(to_jsonb(x) order by x.pinned desc,x.latest_at desc,x.id),'[]') from(select a.id,p.id target,p.username,p.presence and p.last_seen>now()-interval '45 seconds' online,coalesce(ir.pinned,false) pinned,coalesce(ir.muted,false) muted,coalesce((select created_at from public.acc_messages where room=a.id and not deleted order by id desc limit 1),a.created_at) latest_at,
    case when coalesce(ir.muted,false) then 0 else (select count(*) from public.acc_messages msg where msg.room=a.id and msg.id>me.last_read and not msg.deleted and msg.author<>u and not acc_private.blocked(u,msg.author)) end unread
    from public.acc_rooms a join public.acc_members me on me.room=a.id and me.person=u join public.acc_members them on them.room=a.id and them.person<>u join public.acc_profiles p on p.id=them.person left join public.acc_inbox_rooms ir on ir.person=u and ir.room=a.id
    where a.kind='dm' and acc_private.access(a.id) and not acc_private.blocked(u,p.id) and not p.suspended)x));
 elsif op='noticeRead' then
  update public.acc_notifications set read_at=coalesce(read_at,now()) where person=u and id=(b->>'id')::bigint and acc_private.notice_visible(actor,room,kind,message);
 elsif op='noticesReadAll' then
  update public.acc_notifications set read_at=now() where person=u and id<=(b->>'through')::bigint and read_at is null and acc_private.notice_visible(actor,room,kind,message);
 elsif op='inboxSettings' then
  insert into public.acc_inbox_settings(person,dms,friends,announcements,sound) values(u,(b->>'dms')::boolean,(b->>'friends')::boolean,(b->>'announcements')::boolean,(b->>'sound')::boolean) on conflict(person) do update set dms=excluded.dms,friends=excluded.friends,announcements=excluded.announcements,sound=excluded.sound;
 elsif op='inboxRoom' then
  if not acc_private.access(r) then raise exception 'Room access denied';end if;
  insert into public.acc_inbox_rooms(person,room,pinned,muted) values(u,r,coalesce((b->>'pinned')::boolean,false),coalesce((b->>'muted')::boolean,false)) on conflict(person,room) do update set pinned=excluded.pinned,muted=excluded.muted;
 else raise exception 'Unknown inbox operation';end if;return '{"ok":true}';
end $$;
revoke all on function acc_private.touch_inbox(uuid),acc_private.notice_privacy_change(),acc_private.notice_message_deleted() from public,anon,authenticated;
revoke all on function acc_private.notice_recipient(uuid),acc_private.notice_visible(uuid,uuid,text,bigint),acc_private.emit_notice(uuid,uuid,text,uuid,bigint,text),acc_private.message_notice(),acc_private.friend_notice(),acc_private.notice_room_read(),acc_private.inbox(text,jsonb) from public,anon,authenticated;
grant execute on function acc_private.notice_visible(uuid,uuid,text,bigint),acc_private.inbox(text,jsonb) to authenticated;
-- Keep the existing routing, and make announcement posting strictly owner-only.
create or replace function public.acc_call(op text,b jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$declare result jsonb;begin
 if op in ('inboxSnapshot','noticeRead','noticesReadAll','inboxSettings','inboxRoom') then return acc_private.inbox(op,b);end if;
 if op in ('registrationStatus','pendingRegistrations','approveRegistration','revokeRegistration','deletePendingRegistration') then return acc_private.admission(op,b);end if;
 if op in ('listTesterInvites','createTesterInvite','revokeTesterInvite') then return acc_private.invitations(op,b);end if;
 -- This check lives in the private definer wrapper; the public invoker cannot read private room settings.
 return acc_private.manage_notifications(op,b);
end $$;
create function acc_private.manage_notifications(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if not acc_private.verified() then raise exception 'Approved authenticated account required';end if;
 if op='send' and (exists(select 1 from acc_private.channel_settings where room=(b->>'room')::uuid and announcement) or exists(select 1 from public.acc_rooms where id=(b->>'room')::uuid and name='announcements' and kind='school')) and not acc_private.is_owner() then raise exception 'Announcements are owner-only';end if;
 result:=acc_private.manage(op,b);
 if op='bootstrap' then result:=jsonb_set(result,'{rooms}',coalesce((select jsonb_agg(case when exists(select 1 from acc_private.channel_settings where room=(x->>'id')::uuid and announcement) or x->>'name'='announcements' then x||jsonb_build_object('canPost',acc_private.is_owner()) else x end) from jsonb_array_elements(result->'rooms')x),'[]'));end if;
 return result;
end $$;
revoke all on function acc_private.manage_notifications(text,jsonb) from public,anon,authenticated;
grant execute on function acc_private.manage_notifications(text,jsonb) to authenticated;
-- Route all existing management entrypoints through the strict announcement check.
-- Existing manage has no exposed public endpoint; direct private execution is revoked.
revoke execute on function acc_private.manage(text,jsonb) from authenticated;
alter publication supabase_realtime add table public.acc_notifications,public.acc_inbox_settings,public.acc_inbox_rooms;
commit;
