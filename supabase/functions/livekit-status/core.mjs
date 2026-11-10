export const APP_ORIGIN='https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site';
export const PROJECT='wss://after-class-chat-nud0wr9r.livekit.cloud';
export function configured(env){return ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'].every(k=>typeof env(k)==='string'&&env(k).trim().length>0)}
const encode=v=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(v)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export async function adminProbeToken(key,secret,now=Math.floor(Date.now()/1000)){
 const head=encode({alg:'HS256',typ:'JWT'}),payload=encode({iss:key,nbf:now-5,exp:now+60,jti:crypto.randomUUID(),video:{roomList:true}}),input=head+'.'+payload;
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(input)));
 return input+'.'+btoa(String.fromCharCode(...signature)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
export function makeHandler({env,fetchImpl=fetch}){
 let lastProbe=0,cached=null;
 const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':APP_ORIGIN,'Vary':'Origin','X-Content-Type-Options':'nosniff'}});
 return async function handler(req){
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':APP_ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type','Vary':'Origin'}});
  if(req.method==='GET')return json({mediaEnabled:false,configured:configured(env)});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(req.headers.get('Origin')!==APP_ORIGIN)return json({error:'Origin denied'},403);
  const auth=req.headers.get('Authorization');if(!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(auth||''))return json({error:'Owner authentication required'},401);
  const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY');if(!url||!key)return json({error:'Authentication unavailable'},503);
  try{
   const res=await fetchImpl(url+'/rest/v1/rpc/acc_call',{method:'POST',headers:{apikey:key,Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({op:'bootstrap',b:{}}),signal:AbortSignal.timeout(7000),redirect:'error'});
   if(!res.ok)return json({error:'Owner authentication required'},401);
   const boot=await res.json();if(boot?.self?.owner!==true)return json({error:'Owner only'},403);
   if(!configured(env))return json({configured:false,mediaEnabled:false,providerAuthenticated:false});
   if(env('LIVEKIT_URL')!==PROJECT)return json({error:'Unexpected LiveKit project URL',mediaEnabled:false},503);
   if(cached&&Date.now()-lastProbe<60000)return json(cached);
   const token=await adminProbeToken(env('LIVEKIT_API_KEY'),env('LIVEKIT_API_SECRET'));
   const response=await fetchImpl('https://after-class-chat-nud0wr9r.livekit.cloud/twirp/livekit.RoomService/ListRooms',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(7000),redirect:'error'});
   // Never forward room names, participant data, provider errors or credentials.
   await response.body?.cancel();cached={configured:true,mediaEnabled:false,providerAuthenticated:response.ok};lastProbe=Date.now();return json(cached);
  }catch{return json({error:'Configuration check unavailable',mediaEnabled:false},503)}
 };
}
