'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('./garage-catalog.js'),S=require('./shop-catalog.js');
const key='afterclass-garage-v2',saved=new Map();let now=Date.parse('2026-10-30T12:00:00Z'),fail=false,queue=Promise.resolve();
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const store={getItem:k=>saved.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('quota');saved.set(k,v);}};
const locks={request:(name,fn)=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;}};
const source=fs.readFileSync(__dirname+'/progression.js','utf8');
function load(){const ctx={module:{exports:{}},require:name=>name==='./shop-catalog.js'?{...S,daily:()=>S.daily(now)}:require(name),Date:Clock,localStorage:store,navigator:{locks},crypto:{getRandomValues:a=>{a[0]=0;}}};vm.runInNewContext(source,ctx);return ctx.module.exports;}
let P=load(),serial=0;const request=(extra={})=>({id:'checkout-'+(++serial),game:'apex',type:'vehicle',tier:'rare',...extra});
(async()=>{
 // Frozen daily selections, UTC boundary, no consecutive repeated item, and exact premium prices.
 for(let i=-1;i<900;i++){const d=S.daily(i*86400000),next=S.daily((i+1)*86400000);assert.equal(d.offers.length,2);assert.equal(d.offers[0].type,'vehicle');assert.equal(d.offers[1].type,'livery');for(let j=0;j<2;j++){assert.notEqual(d.offers[j].item.id,next.offers[j].item.id);assert.equal(d.offers[j].price,C.packages[d.offers[j].rarity][d.offers[j].type]*({rare:4,legendary:5,ultra:6}[d.offers[j].rarity]));}assert.deepEqual(S.daily(i*86400000+86399999),d);}
 assert.deepEqual(S.daily(Date.parse('2026-10-31T00:00:00Z')),S.daily(Date.parse('2026-10-30T19:00:00-05:00')));
 assert.equal((await P.checkout(request())).ok,false);assert.equal(P.read('apex').balance,0);
 P.event('apex','test-credit',1,1000000);const before=P.read('apex'),req=request();
 const [a,b]=await Promise.all([P.checkout(req),P.checkout(req)]);assert(a.ok);assert(b.replayed);assert.equal(P.read('apex').balance,before.balance-600);assert.equal(P.read('apex').owned.filter(x=>x===a.item.id).length,1);
 const duplicate=await P.checkout(request());assert(duplicate.duplicate);assert.equal(duplicate.refund,400);assert.equal(duplicate.netCost,200);
 const paid=P.read('apex').balance;P=load();assert((await P.checkout(req)).replayed);assert.equal(P.read('apex').balance,paid);
 assert.equal((await P.checkout({...req,type:'livery'})).ok,false);
 // Two independent JS contexts share the lock and cannot overwrite each other's deductions/collections.
 const other=load(),funds=P.read('apex').balance;
 const concurrent=await Promise.all([P.checkout(request({game:'drift'})),other.checkout(request({game:'apex',type:'livery'}))]);assert(concurrent.every(x=>x.ok));assert.equal(P.read('tide').balance,funds-900);
 assert(P.equip('apex',concurrent[1].item.vehicle,concurrent[1].item.id));assert.equal(load().appearance('apex',concurrent[1].item.vehicle).id,concurrent[1].item.id);
 const oldSnapshot=store.getItem(key);fail=true;assert.equal((await P.checkout(request({game:'drift',type:'livery'}))).ok,false);assert.equal(store.getItem(key),oldSnapshot);assert.equal(P.read('apex').balance,JSON.parse(oldSnapshot).balance);fail=false;
 for(const o of S.daily(now).offers){const r=request({game:o.game,type:o.type,offerId:o.id,tier:undefined}),balance=P.read(o.game).balance,result=await P.checkout(r);assert(result.ok);assert(result.guaranteed);assert.equal(result.item.id,o.item.id);assert.equal(P.read(o.game).balance,balance-o.price);assert.equal((await P.checkout({...r,id:'owned-repeat-'+serial})).ok,false);assert.equal(P.read(o.game).balance,balance-o.price);assert((await load().checkout(r)).replayed);}
 const stale=S.daily(now).offers[0];now+=86400000;assert.equal((await P.checkout(request({game:stale.game,type:stale.type,offerId:stale.id}))).ok,false);
 // Direct liveries may be collected before their vehicle; normalization must retain them.
 for(let i=0;i<80;i++){const o=S.daily(now).offers[1];if(!P.read(o.game).owned.includes(o.vehicle)){const r=await P.checkout(request({game:o.game,type:'livery',offerId:o.id}));assert(r.ok);assert(load().read(o.game).liveries.includes(o.item.id));assert.equal(P.equip(o.game,o.vehicle,o.item.id),false);break;}now+=86400000;}
 for(const game of Object.keys(C.games))for(const tier of C.tiers)for(const type of ['vehicle','livery']){const contents=S.contents(game,type,tier,P.read(game));if(game==='tide'&&type==='vehicle'){assert.equal(contents.length,0);continue;}assert(Math.abs(contents.reduce((s,x)=>s+x.chance,0)-1)<1e-10);for(let i=0;i<3;i++)assert(Math.abs(contents.filter(x=>x.item.rarity===C.tiers[i]).reduce((s,x)=>s+x.chance,0)-C.packages[tier].odds[i])<1e-10);}
 // Buying never changes records, claims, equipped looks, or earning rates.
 const profile=P.read('apex'),w=JSON.parse(saved.get(key));w.profiles.apex.daily={date:P.dateKey(),progress:{finishes:1},claimed:['already-claimed']};w.profiles.apex.bestTimes={one:44};saved.set(key,JSON.stringify(w));const preserved=P.read('apex');await P.checkout(request());const after=P.read('apex');assert.deepEqual(after.daily,preserved.daily);assert.deepEqual(after.bestTimes,preserved.bestTimes);assert.deepEqual(after.equipped,preserved.equipped);assert.equal(P.event('apex','earning-check',1,100).points,85);
 console.log('PASS shop: fixed UTC rotation/no yesterday repeats, unchanged prices/odds/refunds/earnings, insufficient funds, guaranteed/owned/stale offers, idempotent double requests, cross-tab serialization, rollback on storage failure, equipment and reload persistence, locked-vehicle livery retention, records/dailies unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
