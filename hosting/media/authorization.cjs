'use strict';
// Candidate only: not wired into the public Worker and cannot issue LiveKit JWTs.
const SUPABASE='https://gvurobdhsvcvdywdsgne.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class MediaDenied extends Error{constructor(status,message){super(message);this.status=status;}}
async function authorizeVoice(request,{fetchImpl=fetch,publishableKey,origin}){
 if(request.method!=='POST')throw new MediaDenied(405,'POST required');
 if(!origin||request.headers.get('Origin')!==origin)throw new MediaDenied(403,'Same-origin media request required');
 const bearer=request.headers.get('Authorization');if(!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(bearer||''))throw new MediaDenied(401,'Authenticated session required');
 if(!publishableKey)throw new MediaDenied(503,'Media authorization is not configured');
 const content=await request.text();if(content.length>512)throw new MediaDenied(413,'Request too large');
 let body;try{body=JSON.parse(content)}catch{throw new MediaDenied(400,'Invalid request')}
 if(!body||typeof body!=='object'||!UUID.test(body.room||'')||Object.keys(body).some(k=>k!=='room'))throw new MediaDenied(400,'Only a room ID is accepted');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);let response;
 try{response=await fetchImpl(SUPABASE+'/rest/v1/rpc/acc_media_authorize',{method:'POST',headers:{apikey:publishableKey,Authorization:bearer,'Content-Type':'application/json'},body:JSON.stringify({room:body.room}),signal:controller.signal,redirect:'error'});}catch{throw new MediaDenied(503,'Media authorization unavailable');}finally{clearTimeout(timeout)}
 if(!response.ok)throw new MediaDenied(response.status===401?401:403,'Voice access denied');
 let grant;try{grant=await response.json()}catch{throw new MediaDenied(503,'Invalid media authorization response')}
 if(!grant||!UUID.test(grant.identity||'')||grant.room!=='acc-'+body.room||grant.subscribe!==true||!Number.isInteger(grant.capacity)||grant.capacity<2||grant.capacity>24||['microphone','camera','screen'].some(k=>typeof grant[k]!=='boolean')||(!grant.microphone&&(grant.camera||grant.screen)))throw new MediaDenied(503,'Invalid media permission response');
 // Sources are explicit: an empty publish-source array must never accidentally enable all sources.
 return {identity:grant.identity,room:grant.room,capacity:grant.capacity,canSubscribe:true,canPublish:grant.microphone||grant.camera||grant.screen,canPublishSources:[...(grant.microphone?['microphone']:[]),...(grant.camera?['camera']:[]),...(grant.screen?['screen_share','screen_share_audio']:[])]};
}
module.exports={authorizeVoice,MediaDenied};
