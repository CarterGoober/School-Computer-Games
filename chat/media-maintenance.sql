-- Idle cron ticks do not invoke the Edge Function. No service-role or LiveKit secret in this job.
begin;
create extension if not exists pg_net with schema extensions;
revoke usage on schema net from public,anon,authenticated;
select cron.schedule('acc-media-enforce','* * * * *',$job$
 select net.http_post(url:='https://gvurobdhsvcvdywdsgne.supabase.co/functions/v1/livekit-media/maintain',headers:='{"Content-Type":"application/json","apikey":"sb_publishable_ybsqZOeS8tIvyA6iHN8rgw_ThhIZhiF","Authorization":"Bearer sb_publishable_ybsqZOeS8tIvyA6iHN8rgw_ThhIZhiF"}'::jsonb,body:='{}'::jsonb,timeout_milliseconds:=10000)
 where exists(select 1 from acc_private.media_leases);
$job$);
commit;
