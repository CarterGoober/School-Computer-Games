// Test-only transport. No browser prices, live keys, or subscription creation.
export function siteURL(env) {
 const url=new URL(env('GARAGE_SITE_URL')||'https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site');
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid site origin');
 return url.origin;
}
export async function checkout({env,product,order,user,fetcher=fetch}) {
 const key=env('STRIPE_SECRET_KEY');
 if(!key?.startsWith('sk_test_'))throw Error('Stripe test key required');
 if(!product.active||!Number.isSafeInteger(product.price_cents)||product.price_cents<49||product.price_cents>399||product.currency!=='usd')throw Error('Invalid server catalog item');
 if(!product.stripe_price_id?.startsWith('price_'))throw Error('Stripe test price not configured');
 const priceResponse=await fetcher('https://api.stripe.com/v1/prices/'+encodeURIComponent(product.stripe_price_id),{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!priceResponse.ok)throw Error('Stripe price unavailable');
 const price=await priceResponse.json();
 if(price.livemode!==false||price.active!==true||price.type!=='one_time'||price.recurring||price.unit_amount!==product.price_cents||price.currency!==product.currency)throw Error('Stripe price does not match catalog');
 const body=new URLSearchParams({mode:'payment','line_items[0][price]':product.stripe_price_id,'line_items[0][quantity]':'1',client_reference_id:user,'metadata[order_id]':order,'payment_intent_data[metadata][order_id]':order,success_url:siteURL(env)+'/shop.html?tab=owned&checkout=returned',cancel_url:siteURL(env)+'/shop.html?tab=paid&checkout=canceled'});
 const r=await fetcher('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'garage-order-'+order},body,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Stripe checkout unavailable');
 const session=await r.json();
 if(session.livemode!==false||!session.id?.startsWith('cs_test_')||!session.url?.startsWith('https://checkout.stripe.com/'))throw Error('Unexpected Stripe session');
 return {id:session.id,url:session.url};
}
export async function verifyWebhook(raw,header,secret,now=Date.now()) {
 if(typeof raw!=='string'||raw.length>262144||!secret?.startsWith('whsec_'))throw Error('Invalid webhook');
 const parts=(header||'').split(',').map(p=>p.split('='));
 const timestamps=parts.filter(([k])=>k==='t');if(timestamps.length!==1)throw Error('Invalid signature');
 const timestamp=timestamps[0][1];if(!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)throw Error('Expired signature');
 const signatures=parts.filter(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/.test(v)).map(([,v])=>v);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)));
 const expected=Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
 if(!signatures.some(sig=>{let mismatch=0;for(let i=0;i<64;i++)mismatch|=sig.charCodeAt(i)^expected.charCodeAt(i);return mismatch===0}))throw Error('Invalid signature');
 const event=JSON.parse(raw);if(event.livemode!==false||typeof event.id!=='string'||!event.id.startsWith('evt_'))throw Error('Only test events accepted');
 return event;
}
export function paidSession(event,order) {
 const s=event.data?.object;
 return ['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&s?.mode==='payment'&&s.payment_status==='paid'&&s.livemode===false&&s.id===order.session_id&&s.metadata?.order_id===order.id&&s.client_reference_id===order.user_id&&s.amount_total===order.amount_cents&&s.currency===order.currency;
}
