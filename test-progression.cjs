'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('./garage-catalog.js'),T=require('./tide-physics.js'),R=require('./physics.js');
const saved=new Map();let today='2026-10-29T12:00:00',blocked=false;
const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>{if(blocked)throw Error('Storage full');saved.set(k,v);}};
class TestDate extends Date{constructor(...args){super(...(args.length?args:[today]));}static now(){return new Date(today).getTime();}}
function load(){const ctx={module:{exports:{}},require,localStorage:storage,Date:TestDate};vm.runInNewContext(fs.readFileSync(__dirname+'/progression.js','utf8'),ctx);return ctx.module.exports;}
let P=load();
const credit=(game,n=100000)=>P.event(game,'test-credit',1,n);
const roll=(rarity,item=0)=>{const numbers=[rarity,item];return()=>numbers.shift();};
assert.equal(C.liveries.length,39);assert.equal(new Set(C.liveries.map(p=>p.name)).size,39);
assert.deepEqual(C.tiers.map(t=>[C.packages[t].vehicle,C.packages[t].livery]),[[600,300],[1800,900],[4800,2700]],'harder earning keeps the same pack prices');
for(const game of Object.keys(C.games))for(const task of P.tasks(game))assert(task.reward>=24&&task.reward<=52,'daily rewards use the reduced economy');
for(const id of Object.keys(C.models))assert.deepEqual(C.liveries.filter(p=>p.vehicle===id).map(p=>p.rarity),['rare','legendary','ultra']);
assert.equal(P.read('apex').balance,0);assert.equal(P.read('drift').owned.length,4);assert.equal(P.read('tide').owned.length,2);
assert.equal(P.purchase('apex','vehicle','rare').ok,false);assert.equal(P.equip('apex','hybrid'),false);
credit('apex');assert.equal(P.read('drift').balance,0);assert.equal(P.read('tide').balance,0);
for(const tier of C.tiers){
 const price=C.packages[tier].vehicle;let first=P.purchase('apex','vehicle',tier,roll(.999,0));assert.equal(first.item.id,'hybrid');
 const before=P.read('apex').balance,duplicate=P.purchase('apex','vehicle',tier,roll(.999,0));assert(duplicate.duplicate);assert.equal(duplicate.refund,price*2/3);assert.equal(before-P.read('apex').balance,price/3);
}
assert.equal(P.read('apex').owned.filter(id=>id==='hybrid').length,1);assert(P.equip('apex','hybrid'));
for(const tier of C.tiers){const price=C.packages[tier].livery;P.purchase('apex','livery',tier,roll(.999,.999));const before=P.read('apex').balance,d=P.purchase('apex','livery',tier,roll(.999,.999));assert(d.duplicate);assert.equal(d.refund,price*2/3);assert.equal(before-P.read('apex').balance,price/3);}
assert(P.equip('apex','hybrid','hybrid-ultra'));assert.equal(P.equip('apex','apex','hybrid-ultra'),false);
const existingWallet=P.read('apex').balance;P=load();assert.equal(P.read('apex').balance,existingWallet,'the new earning rates do not reduce saved balances');assert.equal(P.appearance('apex','hybrid').id,'hybrid-ultra','collection, wallet, and equipped livery survive reload');assert.equal(P.read('drift').owned.includes('hybrid'),false);
assert.equal(P.purchase('tide','vehicle','ultra').ok,false);credit('tide');
for(const tier of C.tiers){const counts={rare:0,legendary:0,ultra:0};credit('drift',10000000);for(let i=0;i<1000;i++){const d=P.purchase('drift','vehicle',tier,roll((i+.5)/1000));assert(d.ok);counts[d.rarity]++;}assert.deepEqual(Object.values(counts),C.packages[tier].odds.map(n=>n*1000));}
for(let i=0;i<60;i++){const d=P.purchase('tide','livery',C.tiers[i%3],roll((i+.5)/60,i%2?.99:0));assert(['cargo','cruise'].includes(d.item.vehicle),'boat cans only draw boat designs');}
const task=P.tasks('tide').find(t=>t.event==='finishes'),before=P.read('tide').balance;
const daily=P.event('tide','finishes',1,100,'delivery-once');assert.equal(daily.daily,task.reward);assert.equal(P.event('tide','finishes',1,100,'delivery-once').total,0);assert.equal(P.read('tide').balance,before+100+task.reward);
assert.equal(P.event('tide','finishes',1,0,'delivery-twice').daily,0);const retained=P.read('tide').balance;today='2026-10-30T12:00:00';assert.equal(P.read('tide').daily.claimed.length,0);assert.equal(P.read('tide').balance,retained);assert.equal(P.event('tide','finishes',1,0,'new-day').daily,40);
const slow=P.finishRace(P.begin('apex'),{time:70,best:65,trackId:0}),fast=P.finishRace(P.begin('apex'),{time:35,best:65,trackId:0});assert(fast.speed>slow.speed);assert.equal(slow.pb,0);assert(fast.pb>0);
assert.equal(slow.total-slow.daily,100,'70-second race earns 100 ordinary points, down from 500');assert.equal(fast.total-fast.daily,214,'35-second personal best earns 214 ordinary points, down from 1070');
const once=P.begin('apex');P.finishRace(once,{time:40,best:Infinity});const paid=P.read('apex').balance;assert.equal(P.finishRace(once,{time:40,best:Infinity}),null);assert.equal(P.read('apex').balance,paid);
const run=P.begin('drift'),car={x:0,z:0,speed:20,driftAngle:.4,airborne:false,jumps:0,nextCheckpoint:0};const driftBefore=P.read('drift').balance;
for(let i=0;i<240;i++){car.z+=20/120;P.updateDrive(run,car,1/120);}assert(run.awarded>=2);car.jumps=1;P.updateDrive(run,car,1/120);assert(run.awarded>=11);const jumped=run.awarded;P.updateDrive(run,car,1/120);assert.equal(run.awarded,jumped,'a jump pays only once');assert(P.read('drift').balance>driftBefore);
const cargo=T.create();require('./test-tide-crane.cjs').loadCargo(cargo);assert.equal(cargo.crane.perfects,6);const voyageRun=P.begin('tide');P.updateBoat(voyageRun,cargo);assert(voyageRun.awarded>=6*28);const loaded=voyageRun.awarded;P.updateBoat(voyageRun,cargo);assert.equal(voyageRun.awarded,loaded,'secured cargo cannot pay again');
assert.equal(voyageRun.awarded-voyageRun.daily,168,'six perfect placements earn 168 ordinary points, down from 840');
const outcomes=[];for(const difficulty of ['easy','medium','hard']){const s=T.create('cruise',difficulty);s.stage='complete';s.voyageTime=100;outcomes.push(P.finishBoat(P.begin('tide'),s));}assert(outcomes[0].base<outcomes[1].base&&outcomes[1].base<outcomes[2].base);
assert.deepEqual(outcomes.map(r=>r.total-r.daily),[112,168,246],'full delivery rewards are reduced while harder seas still pay more');
const failed=T.create();failed.stage='failed';const f=P.finishBoat(P.begin('tide'),failed);assert.equal(f.total,0,'failure gives no completion bonus');
const eventShip=T.create('cruise','hard'),eventRun=P.begin('tide');eventShip.stage='sailing';T.triggerIncident(eventShip,'engine');for(let i=0;i<16;i++)T.tapRestart(eventShip);P.updateBoat(eventRun,eventShip);assert.equal(eventRun.awarded-eventRun.daily,18,'actual hard engine restart earns scaled points');eventShip.stats.rescues++;eventShip.stats.pirates++;P.updateBoat(eventRun,eventShip);assert.equal(eventRun.awarded-eventRun.daily,18+44+31);
const storedBalance=P.read('apex').balance;blocked=true;P.event('apex','storage-test',1,75);assert.equal(P.read('apex').balance,storedBalance+75);P.event('apex','storage-test',1,25);assert.equal(P.read('apex').balance,storedBalance+100,'failed storage writes retain session earnings');assert.equal(P.storageAvailable,false);blocked=false;
// Every new Apex vehicle completes a real lap with its own handling stats.
for(const model of C.newVehicles){for(let id=0;id<3;id++){const track=R.createTrack(id),car=R.spawn(track);car.vehicleStats=model;for(let i=0;i<21600&&!car.finished;i++){const n=R.nearest(track,car.x,car.z),target=track.samples[(n.index+4)%track.samples.length],desired=Math.atan2(target.x-car.x,target.z-car.z),delta=Math.atan2(Math.sin(desired-car.heading),Math.cos(desired-car.heading));R.step(car,track,{up:car.speed<18,down:car.speed>19,left:delta<-.035,right:delta>.035},1/120);}assert(car.finished,model.id+' finishes '+track.name);}}
console.log('PASS isolated wallets, all 39 designs, 3-tier odds/prices, exact duplicate refunds, persistence/equipment, daily rollover/deduplication, speed/PB/skill/difficulty rewards, perfect crane loading, and all new Apex vehicles on all circuits');
