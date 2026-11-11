begin;
-- Official communities are school channels in this installation, not acc_servers rows.
-- Reuse their room IDs and grade policies; never duplicate their conversations.
insert into acc_private.voice_channels(room,capacity,camera,screen)
select r.id,8,true,true from public.acc_rooms r join acc_private.channel_settings c on c.room=r.id
where r.kind='school' and not c.announcement and not c.archived
on conflict(room) do nothing;
create or replace function acc_private.voice_rosters(ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r uuid;g jsonb;result jsonb:='[]';begin
 if not acc_private.verified() then raise exception 'Active student session required';end if;
 if coalesce(array_length(ids,1),0)>40 then raise exception 'Too many rooms';end if;
 for r in select distinct unnest(ids) loop
  begin g:=acc_private.media_authorize(r);exception when others then continue;end;
  result:=result||jsonb_build_array(jsonb_build_object('room',r,'capacity',g->'capacity','camera',g->'camera','screen',g->'screen','participants',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.username)),'[]') from acc_private.media_leases l join public.acc_profiles p on p.id=l.person where l.room=r and l.expires>now() and l.applied is not null and not p.suspended and not acc_private.blocked(auth.uid(),p.id))));
 end loop;return result;
end $$;
create or replace function public.acc_voice_rosters(rooms uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$select acc_private.voice_rosters(rooms)$$;
revoke all on function acc_private.voice_rosters(uuid[]),public.acc_voice_rosters(uuid[]) from public,anon,authenticated;
grant execute on function acc_private.voice_rosters(uuid[]),public.acc_voice_rosters(uuid[]) to authenticated;
commit;
