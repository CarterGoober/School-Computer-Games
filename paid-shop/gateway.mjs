import {checkout,verifyWebhook,siteURL} from './stripe.mjs';
async function bounded(req,max){const reader=req.body?.getReader();if(!reader)throw Error('Missing body');const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('Request too large')}chunks.push(value)}const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}return new TextDecoder().decode(bytes)}
export async function handle(req,env,fetcher=fetch){
 const origin=siteURL(env),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin},reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 const rpc=async(name,body,token,key)=>{const r=await fetcher(env('SUPABASE_URL')+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:token,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Commerce request unavailable or access denied');return r.json()};
 if(new URL(req.url).pathname.endsWith('/webhook')){
  if(req.method!=='POST')return reply(405,{error:'POST required'});
  let event;try{event=await verifyWebhook(await bounded(req,262144),req.headers.get('stripe-signature'),env('STRIPE_WEBHOOK_SECRET'))}catch{return reply(400,{error:'Invalid test webhook'})}
  try{const key=env('SUPABASE_SERVICE_ROLE_KEY');await rpc('garage_payment',{op:'event',b:event},'Bearer '+key,key);return reply(200,{received:true})}catch{return reply(503,{error:'Processing incomplete; retry delivery'})}
 }
 if(req.headers.get('Origin')!==origin)return reply(403,{error:'Origin denied'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'authorization,apikey,content-type'}});
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 if(env('GARAGE_COMMERCE_TEST_ENABLED')!=='true'||!env('STRIPE_SECRET_KEY')?.startsWith('sk_test_')||!env('GARAGE_REFUND_POLICY_URL'))return reply(503,{error:'Private test checkout is not configured'});
 const token=req.headers.get('Authorization');if(!/^Bearer \S{20,8192}$/.test(token||''))return reply(401,{error:'Sign in to Garage'});
 try{
  const body=JSON.parse(await bounded(req,4096));if(typeof body.product!=='string'||body.consent!==true||Object.keys(body).some(k=>!['product','consent'].includes(k)))return reply(400,{error:'Choose an item and confirm purchase permission'});
  const d=await rpc('garage_shop',{op:'reserve',b:{product:body.product}},token,env('SUPABASE_ANON_KEY'));
  const session=await checkout({env,product:d.product,order:d.order.id,user:d.order.user_id,fetcher});
  const key=env('SUPABASE_SERVICE_ROLE_KEY');await rpc('garage_payment',{op:'bind',b:{order:d.order.id,session:session.id}},'Bearer '+key,key);
  return reply(200,{url:session.url,testMode:true});
 }catch{return reply(409,{error:'Checkout could not start. Check ownership, private test access and catalog configuration. No ownership was granted.'})}
}
