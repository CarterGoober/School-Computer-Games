export const ORIGIN='https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site',PROJECT='wss://after-class-chat-nud0wr9r.livekit.cloud';
const enc=o=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export async function jwt(key,secret,video,extra={},now=Math.floor(Date.now()/1000)){const input=enc({alg:'HS256',typ:'JWT'})+'.'+enc({iss:key,nbf:now-5,iat:now,exp:now+120,...extra,video}),k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),sig=new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(input)));return input+'.'+btoa(String.fromCharCode(...sig)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
export function grants(g){const sources=[...(g.microphone?['microphone']:[]),...(g.camera?['camera']:[]),...(g.screen?['screen_share','screen_share_audio']:[])];return {roomJoin:true,room:g.room,canSubscribe:true,canPublish:sources.length>0,canPublishData:false,canPublishSources:sources}}
export function makeHandler({env,fetchImpl=fetch}){
 const json=(v,s=200)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'}});
 async function rpc(name,b,auth,server=false){const r=await fetchImpl(env('SUPABASE_URL')+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env(server?'SUPABASE_SERVICE_ROLE_KEY':'SUPABASE_ANON_KEY'),...(server&&auth.startsWith('Bearer sb_secret_')?{}:{Authorization:auth}),'Content-Type':'application/json'},body:JSON.stringify(b),signal:AbortSignal.timeout(7000),redirect:'error'});if(!r.ok){let code='unknown';try{code=(await r.json()).code||'unknown'}catch{}console.error('Media RPC rejected',name,r.status,code);throw Object.assign(Error('Authorization or session unavailable'),{status:403,code:String(code).replace(/[^A-Z0-9_]/g,'').slice(0,20)});}return r.json()}
 const service=(op,b={})=>rpc('acc_media_service',{op,b},'Bearer '+env('SUPABASE_SERVICE_ROLE_KEY'),true);
 async function sfu(method,body,video){const token=await jwt(env('LIVEKIT_API_KEY'),env('LIVEKIT_API_SECRET'),video),r=await fetchImpl(PROJECT.replace('wss:','https:')+'/twirp/livekit.RoomService/'+method,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(7000),redirect:'error'});await r.body?.cancel();if(!r.ok)throw Error('Media service unavailable')}
 async function remove(id,room){await sfu('RemoveParticipant',{room,identity:id,revoke_token_ts:Math.floor(Date.now()/1000)+2},{roomAdmin:true,room});await service('ack',{lease:id,removed:true})}
 async function update(id,g){const permissions={canSubscribe:true,canPublish:!!(g.microphone||g.camera||g.screen),canPublishData:false,canPublishSources:[...(g.microphone?[2]:[]),...(g.camera?[1]:[]),...(g.screen?[3,4]:[])]};await sfu('UpdateParticipant',{room:g.room,identity:id,permission:permissions},{roomAdmin:true,room:g.room});await service('ack',{lease:id,grant:g})}
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type'}});
  if(req.method!=='POST')return json({error:'POST required'},405);
  const maintenance=new URL(req.url).pathname.endsWith('/maintain');
  if(!maintenance&&req.headers.get('Origin')!==ORIGIN)return json({error:'Origin denied'},403);
  const auth=req.headers.get('Authorization');if(!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(auth||''))return json({error:'Authentication required'},401);
  if(env('LIVEKIT_URL')!==PROJECT||!env('LIVEKIT_API_KEY')||!env('LIVEKIT_API_SECRET')||!env('SUPABASE_SERVICE_ROLE_KEY'))return json({error:'Media unavailable'},503);
  try{
   if(maintenance){if(auth!=='Bearer sb_publishable_ybsqZOeS8tIvyA6iHN8rgw_ThhIZhiF')return json({error:'Maintenance denied'},403);const rows=await service('sweep');for(const row of rows){try{if(row.remove)await remove(row.id,row.room);else if(row.changed)await update(row.id,row.grant)}catch{/* Keep lease for retry; never claim a failed eviction succeeded. */}}return json({ok:true})}
   const reader=req.body?.getReader();let size=0,text='';const decoder=new TextDecoder();if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>512){await reader.cancel();return json({error:'Request too large'},413)}text+=decoder.decode(part.value,{stream:true})}text+=decoder.decode()}let b;try{b=JSON.parse(text)}catch{return json({error:'Invalid request'},400)};
   if(!b||!['status','enable','config','join','heartbeat','leave'].includes(b.op)||Object.keys(b).some(k=>!['op','room','enabled','camera','screen','capacity'].includes(k)))return json({error:'Invalid operation'},400);
   if(b.op==='join'||b.op==='heartbeat'){if(!/^[0-9a-f-]{36}$/i.test(b.room||''))return json({error:'Room required'},400)}
   const result=await rpc('acc_media_session',{op:b.op,room:b.room||null,b:b.op==='enable'?{enabled:!!b.enabled}:b.op==='config'?{camera:!!b.camera,screen:!!b.screen,capacity:b.capacity}:{}},auth);
   if(b.op==='status'||b.op==='enable'||b.op==='config')return json(result);
   const l=result.lease;if(!l?.id)return json({ok:true});
   if(b.op==='leave'){await remove(l.id,'acc-'+l.room);return json({ok:true})}
   const g=result.grant;
   if(b.op==='heartbeat'){if(result.changed)await update(l.id,g);return json({grant:g})}
   await sfu('CreateRoom',{name:g.room,max_participants:g.capacity,empty_timeout:60,departure_timeout:30},{roomCreate:true});
   const token=await jwt(env('LIVEKIT_API_KEY'),env('LIVEKIT_API_SECRET'),grants(g),{sub:l.id,name:result.name});
   await service('ack',{lease:l.id,grant:g});
   return json({url:PROJECT,token,grant:g,lease:l.id});
  }catch(e){return json({error:e.status===403?'Media access denied':'Media service temporarily unavailable'},e.status===403?403:503)}
 };
}
