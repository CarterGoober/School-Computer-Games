-- After Class Chat, additive to Garage feedback. Apply only to its Supabase project.
create schema if not exists acc_private;
revoke all on schema acc_private from public,anon;
grant usage on schema acc_private to authenticated;
create table acc_private.launch(id boolean primary key default true check(id),ready boolean not null default false);
insert into acc_private.launch(id,ready) values(true,false);
create table public.acc_profiles(id uuid primary key references auth.users on delete cascade, username text not null check(username ~ '^[A-Za-z0-9_]{3,20}$'), role text not null default 'student' check(role in ('student','moderator','admin')), suspended boolean not null default false, presence boolean not null default false,last_seen timestamptz,last_post timestamptz);
create unique index acc_username_unique on public.acc_profiles(lower(username));
create table public.acc_rooms(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('school','group','dm')),name text not null check(length(name) between 1 and 50),category text,owner uuid references public.acc_profiles on delete cascade,created_at timestamptz default now());
create table public.acc_members(room uuid references public.acc_rooms on delete cascade,person uuid references public.acc_profiles on delete cascade,last_read bigint default 0,typing_until timestamptz,primary key(room,person));
create index acc_member_person on public.acc_members(person,room);
create table public.acc_friends(sender uuid references public.acc_profiles on delete cascade,recipient uuid references public.acc_profiles on delete cascade,status text check(status in ('pending','accepted')),primary key(sender,recipient),check(sender<>recipient));
create index acc_friends_recipient on public.acc_friends(recipient,status);
create table public.acc_preferences(person uuid references public.acc_profiles on delete cascade,target uuid references public.acc_profiles on delete cascade,blocked boolean default false,muted boolean default false,primary key(person,target),check(person<>target));
create table public.acc_messages(id bigint generated always as identity primary key,room uuid not null references public.acc_rooms on delete cascade,author uuid references public.acc_profiles on delete set null,body text not null check(length(body)<=2000),reply bigint references public.acc_messages on delete set null,nonce uuid not null,deleted boolean default false,created_at timestamptz default now(),unique(author,nonce));
create index acc_message_room_order on public.acc_messages(room,id desc);
create index acc_message_author_recent on public.acc_messages(author,created_at desc);
create index acc_message_search on public.acc_messages using gin(to_tsvector('english',body));
create table public.acc_reactions(message bigint references public.acc_messages on delete cascade,person uuid references public.acc_profiles on delete cascade,emoji text check(emoji in ('👍','❤️','😂','🎉','🤔')),primary key(message,person,emoji));
create table public.acc_reports(id bigint generated always as identity primary key,reporter uuid references public.acc_profiles on delete set null,target uuid references public.acc_profiles on delete set null,message bigint references public.acc_messages on delete set null,reason text not null check(length(reason) between 3 and 500),status text default 'open' check(status in ('open','resolved','dismissed')),note text default '',created_at timestamptz default now(),resolved_by uuid references public.acc_profiles on delete set null);
create index acc_report_queue on public.acc_reports(status,created_at desc);
create table acc_private.audit(id bigint generated always as identity primary key,actor uuid,action text,target text,created_at timestamptz default now());
create or replace function acc_private.register() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is null or lower(new.email) !~ '^[^@[:space:]]+@leisdstudent\.ws$' then raise exception 'Only @leisdstudent.ws student email addresses are accepted';end if;
 if tg_op='INSERT' then
  if not (select ready from acc_private.launch where id) then raise exception 'Student registration is not open yet';end if;
  if coalesce(new.raw_user_meta_data->>'username','') !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Choose a username with 3–20 letters, numbers or underscores';end if;
  insert into public.acc_profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');
 end if;return new;
end $$;
-- After insertion so the profile foreign key can reference auth.users. Email changes remain restricted.
create trigger acc_register after insert or update of email on auth.users for each row execute function acc_private.register();
create or replace function acc_private.verified() returns boolean language sql stable security definer set search_path='' as $$
 select (select ready from acc_private.launch where id) and exists(select 1 from auth.users u join public.acc_profiles p on p.id=u.id where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email) ~ '^[^@[:space:]]+@leisdstudent\.ws$' and not p.suspended and exists(select 1 from auth.sessions s where s.user_id=u.id and s.id::text=auth.jwt()->>'session_id'))
$$;
create or replace function acc_private.staff() returns boolean language sql stable security definer set search_path='' as $$select acc_private.verified() and exists(select 1 from public.acc_profiles where id=auth.uid() and role in ('moderator','admin'))$$;
create or replace function acc_private.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$select case when a is distinct from auth.uid() and b is distinct from auth.uid() then true else exists(select 1 from public.acc_preferences where blocked and ((person=a and target=b)or(person=b and target=a))) end $$;
create or replace function acc_private.access(r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select acc_private.verified() and exists(select 1 from public.acc_rooms where id=r and (kind='school' or exists(select 1 from public.acc_members where room=r and person=auth.uid())))
$$;
-- All protected data stays behind RLS, including WebSocket changes.
alter table public.acc_profiles enable row level security;
revoke all on public.acc_profiles from anon,authenticated;
alter table public.acc_rooms enable row level security;
revoke all on public.acc_rooms from anon,authenticated;
alter table public.acc_members enable row level security;
revoke all on public.acc_members from anon,authenticated;
alter table public.acc_friends enable row level security;
revoke all on public.acc_friends from anon,authenticated;
alter table public.acc_preferences enable row level security;
revoke all on public.acc_preferences from anon,authenticated;
alter table public.acc_messages enable row level security;
revoke all on public.acc_messages from anon,authenticated;
alter table public.acc_reactions enable row level security;
revoke all on public.acc_reactions from anon,authenticated;
alter table public.acc_reports enable row level security;
revoke all on public.acc_reports from anon,authenticated;
grant select on public.acc_messages to authenticated;
create policy acc_message_read on public.acc_messages for select to authenticated using(acc_private.access(room) and not acc_private.blocked((select auth.uid()),author));
-- Only the message table is exposed directly. Other views are shaped by authorized RPCs.
insert into public.acc_rooms(kind,name,category) select 'school',name,category from (values
('general','School'),('announcements','School'),('gaming','School'),('homework-help','School'),
('freshmen','Grades'),('sophomores','Grades'),('juniors','Grades'),('seniors','Grades'),
('math','Subjects'),('english','Subjects'),('science','Subjects'),('history','Subjects'),('spanish','Subjects'),('engineering','Subjects'),('other-subjects','Subjects')) as x(name,category);
create or replace function acc_private.call(op text,b jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t uuid; r uuid; m public.acc_messages; p public.acc_profiles; x jsonb; n text; body text; v bigint; roomrow public.acc_rooms; result jsonb;
begin
 if not acc_private.verified() then raise exception 'Verified school email and active session required';end if;
 select * into p from public.acc_profiles where id=u for no key update;
 if length(b::text)>12000 then raise exception 'Request too large';end if;
 t:=nullif(b->>'target','')::uuid;r:=nullif(b->>'room','')::uuid;
 if op='bootstrap' then
  update public.acc_profiles set last_seen=now() where id=u;
  return jsonb_build_object('self',jsonb_build_object('id',u,'username',p.username,'role',p.role,'presence',p.presence),
   'rooms',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select a.id,a.kind,case when a.kind='dm' then coalesce((select pr.username from public.acc_members mm join public.acc_profiles pr on pr.id=mm.person where mm.room=a.id and mm.person<>u limit 1),'Direct message') else a.name end name,a.category,a.owner,coalesce((select count(*) from public.acc_messages z where z.room=a.id and not z.deleted and z.author<>u and z.id>coalesce((select last_read from public.acc_members where room=a.id and person=u),0) and not acc_private.blocked(u,z.author) and not exists(select 1 from public.acc_preferences pref where pref.person=u and pref.target=z.author and pref.muted)),0) unread from public.acc_rooms a where acc_private.access(a.id) order by a.created_at,a.name)q),
   'people',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'username',username,'role',role,'online',presence and last_seen>now()-interval '45 seconds')),'[]') from public.acc_profiles where not suspended),
   'friends',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.acc_friends f where sender=u or recipient=u),
   'preferences',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.acc_preferences f where person=u));
 elsif op='messages' then
  if not acc_private.access(r) then raise exception 'Room access denied';end if;
  return (select coalesce(jsonb_agg(to_jsonb(q) order by id),'[]') from (select z.id,z.room,z.author,coalesce(pr.username,'Deleted account') username,z.body,z.reply,z.deleted,z.created_at,
   (select coalesce(jsonb_agg(to_jsonb(rx)),'[]') from(select emoji,count(*) count,bool_or(person=u) mine from public.acc_reactions where message=z.id group by emoji) rx) reactions
   from public.acc_messages z left join public.acc_profiles pr on pr.id=z.author where z.room=r and z.id<coalesce(nullif(b->>'before','')::bigint,9223372036854775807) and not acc_private.blocked(u,z.author) and (coalesce(b->>'search','')='' or (not z.deleted and to_tsvector('english',z.body)@@websearch_to_tsquery('english',left(b->>'search',100)))) order by z.id desc limit 50)q);
 elsif op='send' then
  if not acc_private.access(r) then raise exception 'Room access denied';end if;
  select * into roomrow from public.acc_rooms where id=r;
  if roomrow.name='announcements' and roomrow.kind='school' and not acc_private.staff() then raise exception 'Only moderators may post announcements';end if;
  if roomrow.kind='dm' and not exists(select 1 from public.acc_members mm join public.acc_friends f on f.status='accepted' and ((f.sender=u and f.recipient=mm.person)or(f.recipient=u and f.sender=mm.person)) where mm.room=r and mm.person<>u) then raise exception 'Friendship required';end if;
  if roomrow.kind='dm' and exists(select 1 from public.acc_members where room=r and person<>u and acc_private.blocked(u,person)) then raise exception 'Direct messages are blocked';end if;
  if exists(select 1 from public.acc_messages where author=u and nonce=(b->>'nonce')::uuid) then return jsonb_build_object('ok',true);end if;
  if p.last_post>now()-interval '1 second' or (select count(*) from public.acc_messages where author=u and created_at>now()-interval '1 minute')>=25 then raise exception 'Slow down. Message rate limit reached';end if;
  body:=btrim(b->>'body');if body is null or length(body) not between 1 and 2000 then raise exception 'Messages must contain 1–2000 characters';end if;
  if body ~* '\m(fuck|shit|bitch|nigger|faggot)\M' then raise exception 'Please reword your message';end if;
  if body ~* '[[:alnum:]_.+-]+@[[:alnum:]_.-]+\.[[:alpha:]]+' then raise exception 'Keep email addresses private';end if;
  if b->>'reply' is not null and not exists(select 1 from public.acc_messages where id=(b->>'reply')::bigint and room=r and not deleted and not acc_private.blocked(u,author)) then raise exception 'Invalid reply';end if;
  insert into public.acc_messages(room,author,body,reply,nonce) values(r,u,body,(b->>'reply')::bigint,(b->>'nonce')::uuid);update public.acc_profiles set last_post=now() where id=u;
 elsif op='read' or op='typing' then
  if not acc_private.access(r) then raise exception 'Room access denied';end if;
  insert into public.acc_members(room,person) values(r,u) on conflict do nothing;
  if op='read' then update public.acc_members set last_read=coalesce((select max(id) from public.acc_messages where room=r),0) where room=r and person=u;
  else update public.acc_members set typing_until=now()+interval '5 seconds' where room=r and person=u;end if;
 elsif op='members' then
  if not acc_private.access(r) then raise exception 'Room access denied';end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',pr.id,'username',pr.username,'role',pr.role,'typing',mm.typing_until>now(),'online',pr.presence and pr.last_seen>now()-interval '45 seconds')),'[]') from public.acc_members mm join public.acc_profiles pr on pr.id=mm.person where mm.room=r and not acc_private.blocked(u,pr.id));
 elsif op='friend' then
  if t=u or not exists(select 1 from public.acc_profiles where id=t and not suspended) or acc_private.blocked(u,t) then raise exception 'Friend request unavailable';end if;
  if (select count(*) from public.acc_friends where sender=u)>=100 then raise exception 'Friend limit reached';end if;
  if b->>'choice'='accept' then update public.acc_friends set status='accepted' where sender=t and recipient=u and status='pending';
  elsif b->>'choice'='remove' then delete from public.acc_friends where (sender=u and recipient=t) or(sender=t and recipient=u);
  else if exists(select 1 from public.acc_friends where sender=t and recipient=u) then raise exception 'Accept the incoming request instead';end if;insert into public.acc_friends values(u,t,'pending') on conflict do nothing;end if;
 elsif op='dm' then
  if acc_private.blocked(u,t) or not exists(select 1 from public.acc_friends where status='accepted' and ((sender=u and recipient=t)or(sender=t and recipient=u))) then raise exception 'Accept a friend request before direct messaging';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(u::text,t::text)||greatest(u::text,t::text),0));
  select a.id into r from public.acc_rooms a where kind='dm' and exists(select 1 from public.acc_members where room=a.id and person=u) and exists(select 1 from public.acc_members where room=a.id and person=t) limit 1;
  if r is null then insert into public.acc_rooms(kind,name) values('dm','Direct message') returning id into r;insert into public.acc_members(room,person) values(r,u),(r,t);end if;
  return jsonb_build_object('room',r);
 elsif op='group' then
  n:=btrim(b->>'name');if length(n) not between 1 and 50 then raise exception 'Group name must contain 1–50 characters';end if;
  if (select count(*) from public.acc_rooms where owner=u)>=10 then raise exception 'Group limit reached';end if;
  insert into public.acc_rooms(kind,name,owner) values('group',n,u) returning id into r;insert into public.acc_members(room,person) values(r,u);return jsonb_build_object('room',r);
 elsif op in ('invite','remove','rename','leave') then
  select * into roomrow from public.acc_rooms where id=r for update;
  if not acc_private.access(r) or roomrow.kind<>'group' then raise exception 'Group access denied';end if;
  if op='leave' then if roomrow.owner=u then delete from public.acc_rooms where id=r;else delete from public.acc_members where room=r and person=u;end if;
  else
   if roomrow.owner<>u then raise exception 'Only the group owner can manage this group';end if;
   if op='invite' then
    if acc_private.blocked(u,t) or not exists(select 1 from public.acc_friends where status='accepted' and ((sender=u and recipient=t)or(sender=t and recipient=u))) then raise exception 'Invite accepted friends only';end if;
    if (select count(*) from public.acc_members where room=r)>=30 then raise exception 'Group full';end if;
    insert into public.acc_members(room,person) values(r,t) on conflict do nothing;
   elsif op='remove' then if t=u then raise exception 'Use leave to delete your group';end if;delete from public.acc_members where room=r and person=t;
   else n:=btrim(b->>'name');if length(n) not between 1 and 50 then raise exception 'Invalid group name';end if;update public.acc_rooms set name=n where id=r;end if;
  end if;
 elsif op='preference' then
  if t=u then raise exception 'Choose another user';end if;
  insert into public.acc_preferences(person,target,blocked,muted) values(u,t,coalesce((b->>'blocked')::boolean,false),coalesce((b->>'muted')::boolean,false)) on conflict(person,target) do update set blocked=excluded.blocked,muted=excluded.muted;
 elsif op='presence' then update public.acc_profiles set presence=(b->>'enabled')::boolean,last_seen=now() where id=u;
 elsif op='reaction' then
  select * into m from public.acc_messages where id=(b->>'message')::bigint;
  if not acc_private.access(m.room) or m.deleted or acc_private.blocked(u,m.author) then raise exception 'Message access denied';end if;
  if exists(select 1 from public.acc_reactions where message=m.id and person=u and emoji=b->>'emoji') then delete from public.acc_reactions where message=m.id and person=u and emoji=b->>'emoji';else insert into public.acc_reactions values(m.id,u,b->>'emoji');end if;
  update public.acc_messages set body=acc_messages.body where id=m.id; -- authorize notification through original room RLS
 elsif op='deleteMessage' then
  select * into m from public.acc_messages where id=(b->>'message')::bigint;
  if not ((m.author=u and acc_private.access(m.room)) or (acc_private.staff() and (acc_private.access(m.room) or exists(select 1 from public.acc_reports where message=m.id)))) then raise exception 'Deletion denied';end if;
  update public.acc_messages set body='',deleted=true where id=m.id;delete from public.acc_reactions where message=m.id;
  insert into acc_private.audit(actor,action,target) values(u,'deleteMessage',m.id::text);
 elsif op='report' then
  if (select count(*) from public.acc_reports where reporter=u and created_at>now()-interval '1 hour')>=5 then raise exception 'Report limit reached';end if;
  if b->>'message' is not null then select * into m from public.acc_messages where id=(b->>'message')::bigint;if not acc_private.access(m.room) then raise exception 'Message access denied';end if;t:=m.author;end if;
  insert into public.acc_reports(reporter,target,message,reason) values(u,t,(b->>'message')::bigint,left(b->>'reason',500));
 elsif op='adminPeople' then
  if not acc_private.staff() then raise exception 'Moderator access required';end if;return (select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select id,username,role,suspended from public.acc_profiles order by username limit 200)q);
 elsif op='reports' then
  if not acc_private.staff() then raise exception 'Moderator access required';end if;
  return (select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select z.id,z.target,z.message,(select msg.body from public.acc_messages msg where msg.id=z.message) reported_content,z.reason,z.status,z.note,z.created_at,pr.username from public.acc_reports z left join public.acc_profiles pr on pr.id=z.target order by z.id desc limit 100)q);
 elsif op='resolve' or op='suspend' or op='role' then
  if not acc_private.staff() then raise exception 'Moderator access required';end if;
  if op='resolve' then update public.acc_reports set status=b->>'status',note=left(b->>'note',500),resolved_by=u where id=(b->>'report')::bigint;
  else
   if t=u or (select role from public.acc_profiles where id=t)='admin' or (p.role<>'admin' and (select role from public.acc_profiles where id=t)<>'student') then raise exception 'Cannot change that account';end if;
   if op='role' then if p.role<>'admin' then raise exception 'Administrator access required';end if;update public.acc_profiles set role=b->>'role' where id=t;
   else update public.acc_profiles set suspended=(b->>'enabled')::boolean where id=t;delete from auth.sessions where user_id=t;end if;
  end if;
  insert into acc_private.audit(actor,action,target) values(u,op,coalesce(t::text,b->>'report'));
 elsif op='deleteAccount' then
  if b->>'confirm'<>p.username then raise exception 'Type your username to delete your account';end if;
  update public.acc_messages set body='',deleted=true where author=u;delete from auth.sessions where user_id=u;delete from auth.users where id=u;
 else raise exception 'Unknown chat operation';end if;
 return jsonb_build_object('ok',true);
end $$;
create function public.acc_call(op text,b jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select acc_private.call(op,b)$$;
-- Default function privileges must not leave helpers callable by unauthenticated roles.
revoke all on all functions in schema acc_private from public,anon;
grant execute on all functions in schema acc_private to authenticated;
revoke all on function public.acc_call(text,jsonb) from public,anon;
grant execute on function public.acc_call(text,jsonb) to authenticated;
-- Trigger is not a client RPC.
revoke all on function acc_private.register() from authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='acc_messages') then alter publication supabase_realtime add table public.acc_messages;end if;end $$;
-- Automated retention removes old content, reports and audit records without public RPC access.
create function acc_private.retention() returns void language plpgsql security definer set search_path='' as $$begin
 delete from auth.users where email_confirmed_at is null and created_at<now()-interval '7 days';
 delete from public.acc_messages where created_at<now()-interval '90 days';
 delete from public.acc_reports where created_at<now()-interval '30 days' and status<>'open';
 delete from acc_private.audit where created_at<now()-interval '90 days';
end $$;
revoke all on function acc_private.retention() from public,anon,authenticated;

-- Daily automated retention. Open safety reports remain available until reviewed.
create extension if not exists pg_cron;
select cron.schedule('afterclass-chat-retention','25 4 * * *','select acc_private.retention();');

alter table acc_private.launch enable row level security;
alter table acc_private.audit enable row level security;
