-- Additive DM call invitations; no new account/role grants.
begin;
alter table public.acc_inbox_settings add column if not exists calls boolean not null default true;
create table public.acc_calls(id uuid primary key default gen_random_uuid(),room uuid not null references public.acc_rooms on delete cascade,caller uuid not null references public.acc_profiles on delete cascade,recipient uuid not null references public.acc_profiles on delete cascade,status text not null default 'ringing' check(status in ('ringing','accepted','declined','cancelled','expired','ended')),created_at timestamptz not null default now(),expires timestamptz not null default now()+interval '75 seconds',check(caller<>recipient));
create index acc_calls_recipient on public.acc_calls(recipient,created_at desc);
create index acc_calls_caller on public.acc_calls(caller,created_at desc);
create unique index acc_calls_pending_room on public.acc_calls(room) where status in ('ringing','accepted');
alter table public.acc_calls enable row level security;
revoke all on public.acc_calls from public,anon,authenticated;
grant select on public.acc_calls to authenticated;
create function acc_private.call_pilot(p uuid) returns boolean language sql stable security definer set search_path='' as $$select acc_private.media_available(p)$$;
create function acc_private.call_visible(r uuid,a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$select acc_private.verified() and auth.uid() in(a,b) and exists(select 1 from public.acc_rooms where id=r and kind='dm') and exists(select 1 from public.acc_members where room=r and person=a) and exists(select 1 from public.acc_members where room=r and person=b) and exists(select 1 from public.acc_friends where status='accepted' and ((sender=a and recipient=b)or(sender=b and recipient=a))) and not acc_private.blocked(a,b)$$;
create policy own_call_signals on public.acc_calls for select to authenticated using(acc_private.call_visible(room,caller,recipient));
create function acc_private.call_signal(op text,r uuid default null,c uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare u uuid:=auth.uid();t uuid;row public.acc_calls;begin
 if not acc_private.verified() then raise exception 'Approved account session required';end if;
 if op='list' then
  if not acc_private.server_pilot() then return '[]';end if;
  update public.acc_calls set status='expired' where (caller=u or recipient=u) and expires<=now() and(status='ringing' or(status='accepted' and not exists(select 1 from acc_private.media_leases where room=acc_calls.room)));
  update public.acc_calls set status='declined' where recipient=u and status='ringing' and not coalesce((select calls from public.acc_inbox_settings where person=u),true);
  delete from public.acc_calls where created_at<now()-interval '1 day' and status not in ('ringing','accepted') and (caller=u or recipient=u);
  return(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from(select a.*,p.username caller_name,q.username recipient_name from public.acc_calls a join public.acc_profiles p on p.id=a.caller join public.acc_profiles q on q.id=a.recipient where (a.caller=u or a.recipient=u) and acc_private.call_visible(a.room,a.caller,a.recipient) and (a.status in ('ringing','accepted') or a.created_at>now()-interval '3 minutes') order by a.created_at desc limit 20)x);
 end if;
 if not acc_private.server_pilot() then raise exception 'An active student session is required';end if;
 if op='start' then
  if not acc_private.media_available(u) then raise exception 'Voice is temporarily unavailable';end if;
  if not acc_private.access(r) or not exists(select 1 from public.acc_rooms where id=r and kind='dm') or (select count(*) from public.acc_members where room=r)<>2 then raise exception 'Open an accepted friend DM to call';end if;
  select person into t from public.acc_members where room=r and person<>u;
  if not acc_private.call_visible(r,u,t) then raise exception 'This private call is unavailable';end if;
  if not acc_private.call_pilot(t) then raise exception 'Your friend cannot use voice right now. Check account suspension or service availability';end if;
  if not coalesce((select calls from public.acc_inbox_settings where person=t),true) or exists(select 1 from public.acc_inbox_rooms where person=t and room=r and muted) or exists(select 1 from public.acc_preferences where person=t and target=u and muted) then raise exception 'Your friend is unavailable for incoming calls';end if;
  if exists(select 1 from acc_private.media_leases where person=t and room<>r and expires>now()) then raise exception 'Your friend is already in another call';end if;
  perform pg_advisory_xact_lock(hashtextextended('call:'||r::text,0));
  update public.acc_calls set status='expired' where room=r and status='ringing' and expires<=now();
  select * into row from public.acc_calls where room=r and status in ('ringing','accepted') for update;
  if row.id is not null then return to_jsonb(row);end if;
  if (select count(*) from acc_private.audit where actor=u and action='callStart' and created_at>now()-interval '1 minute')>=3 then raise exception 'Please wait before calling again';end if;
  insert into public.acc_calls(room,caller,recipient) values(r,u,t) returning * into row;
  insert into acc_private.audit(actor,action,target) values(u,'callStart',row.id::text);return to_jsonb(row);
 end if;
 select * into row from public.acc_calls where id=c and (caller=u or recipient=u) for update;
 if not found or not acc_private.call_visible(row.room,row.caller,row.recipient) then raise exception 'Call is no longer available';end if;
 if op='accept' then
  if row.recipient<>u then raise exception 'Only the recipient can accept';end if;
  if row.status<>'ringing' or row.expires<=now() then raise exception 'This call has ended or expired';end if;
  if not acc_private.call_pilot(row.caller) or not acc_private.media_available(u) then raise exception 'Call is no longer available';end if;
  if exists(select 1 from acc_private.media_leases where person=u and room<>row.room and expires>now()) then raise exception 'Disconnect your current call first';end if;
  update public.acc_calls set status='accepted' where id=c;
 elsif op='decline' then
  if row.recipient<>u then raise exception 'Only the recipient can decline';end if;
  update public.acc_calls set status='declined' where id=c and status='ringing';
 elsif op='cancel' then update public.acc_calls set status=case when status='accepted' then 'ended' else 'cancelled' end where id=c and status in ('ringing','accepted');
 else raise exception 'Unknown call action';end if;return '{"ok":true}';
end $$;
create function public.acc_call_signal(op text,room uuid default null,call_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select acc_private.call_signal(op,room,call_id)$$;
revoke all on function acc_private.call_pilot(uuid),acc_private.call_visible(uuid,uuid,uuid),acc_private.call_signal(text,uuid,uuid),public.acc_call_signal(text,uuid,uuid) from public,anon,authenticated;
grant execute on function acc_private.call_visible(uuid,uuid,uuid),acc_private.call_signal(text,uuid,uuid),public.acc_call_signal(text,uuid,uuid) to authenticated;
create function acc_private.end_dm_call() returns trigger language plpgsql security definer set search_path='' as $$begin update public.acc_calls set status='ended' where room=old.room and status='accepted' and (caller=old.person or recipient=old.person);return old;end $$;
revoke all on function acc_private.end_dm_call() from public,anon,authenticated;
create trigger acc_end_dm_call after delete on acc_private.media_leases for each row execute function acc_private.end_dm_call();
create or replace function acc_private.inbox(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
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
  insert into public.acc_inbox_settings(person,dms,friends,announcements,sound,calls) values(u,(b->>'dms')::boolean,(b->>'friends')::boolean,(b->>'announcements')::boolean,(b->>'sound')::boolean,coalesce((b->>'calls')::boolean,true)) on conflict(person) do update set dms=excluded.dms,friends=excluded.friends,announcements=excluded.announcements,sound=excluded.sound,calls=excluded.calls;
 elsif op='inboxRoom' then
  if not acc_private.access(r) then raise exception 'Room access denied';end if;
  insert into public.acc_inbox_rooms(person,room,pinned,muted) values(u,r,coalesce((b->>'pinned')::boolean,false),coalesce((b->>'muted')::boolean,false)) on conflict(person,room) do update set pinned=excluded.pinned,muted=excluded.muted;
 else raise exception 'Unknown inbox operation';end if;return '{"ok":true}';
end $$;
alter publication supabase_realtime add table public.acc_calls;
commit;
