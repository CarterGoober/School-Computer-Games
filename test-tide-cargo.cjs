'use strict';
const assert=require('node:assert/strict'),T=require('./tide-physics.js'),P=require('./progression.js');
const {loadCargo,lift,traverse,until}=require('./test-tide-crane.cjs');
const tick=(s,input={},n=1)=>{for(let i=0;i<n;i++)T.step(s,input,1/60);};
// Release preserves the position and velocity, including offsets between the old bays.
const drop=T.create(),c=drop.crane,b=c.boxes[3];c.held=b.id;Object.assign(b,{x:c.origin+9.7,y:37,vx:37,vy:-10,status:'held'});c.angle=0;
const releaseX=b.x;assert(T.craneAction(drop));assert.equal(b.x,releaseX);assert.equal(b.vx,37);until(drop,()=>b.status==='loaded'&&b.rest>.4,{},5);
assert(b.x>releaseX+2,'contact friction allows visible sliding after release');assert([-47,2,51].every(x=>Math.abs(b.x-c.origin-x)>2),'no grid snap');const restingX=b.x;tick(drop,{},180);assert.equal(b.x,restingX,'cargo stays where friction stopped it');

const full=T.create('cargo','hard',13);loadCargo(full,false);const layout=full.crane.boxes.map(b=>[b.x,b.y]);assert(T.Crane.ready(full.crane));
// Even the last placed box can be picked back up to improve the stack.
const top=full.crane.boxes.filter(b=>b.y>50).sort((a,b)=>b.x-a.x)[0];traverse(full,top.x);until(full,()=>T.Crane.grabCandidate(full.crane)?.id===top.id,{down:true});
const perfects=full.crane.perfects;assert(T.craneAction(full));assert.equal(T.depart(full),false);tick(full);assert.equal(full.onboard,5);lift(full);traverse(full,layout[top.id][0]);until(full,()=>top.y<70,{down:true});tick(full,{},45);assert(T.craneAction(full));until(full,()=>T.Crane.ready(full.crane),{},5);assert.equal(full.crane.perfects,perfects,'repositioning cannot farm perfect-placement rewards');
const beforeSailing=full.crane.boxes.map(b=>[b.x,b.y]);assert(T.depart(full));assert.deepEqual(full.crane.boxes.map(b=>[b.x,b.y]),beforeSailing,'departure keeps the exact free placement');tick(full,{right:true},120);assert.equal(full.onboard,6,'normal acceleration preserves a balanced stack');
const still=JSON.stringify(full);T.step(full,{},0);assert.equal(JSON.stringify(full),still,'a zero-time frame cannot corrupt cargo acceleration');

function crossing(bad=false,speed=0){const s=T.create('cargo','hard',13);loadCargo(s);s.ship.x=1800;s.ship.vx=speed;s.eventIn=s.waveIn=9999;if(bad)s.crane.boxes.filter(b=>b.y>50).sort((a,b)=>b.x-a.x)[0].x+=20;tick(s,{},10);return s;}
const calm=crossing(true);tick(calm,{},120);assert.equal(calm.stats.cargoLost,0,'a marginal stack can rest until rough water shifts it');
const balanced=crossing(),bad=crossing(true),fast=crossing(true,106);
for(const s of [balanced,bad,fast]){T.spawnWave(s,true).x=s.ship.x+65;tick(s,{brake:true},360);}
assert.equal(balanced.stats.cargoLost,0,'a balanced stack survives this tsunami');assert.equal(bad.stats.cargoLost,1,'the overhanging top box slides into the water');assert.equal(bad.onboard,5);assert.equal(fast.stats.cargoLost,1);
const lost=bad.crane.boxes.find(b=>b.status==='overboard');assert(lost.world&&Number.isFinite(lost.world.x),'lost box has a separate world-space splash/sinking position');tick(bad,{},300);assert.equal(bad.stats.cargoLost,1,'one lost box is counted once and is not recovered at sea');assert.equal(bad.onboard,5);assert(bad.crane.boxes.filter(b=>b.status!=='overboard').every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));

// Arriving with a partial manifest still finishes the voyage and shows the real count.
bad.ship.x=bad.destination;bad.ship.vx=0;bad.waves=[];tick(bad,{interact:true},220);assert.equal(bad.stage,'complete');assert.equal(bad.onboard,5);const frozen=JSON.stringify(bad.crane);tick(bad,{},120);assert.equal(JSON.stringify(bad.crane),frozen);
const wallet=P.read('tide').balance,run=P.begin('tide');P.updateBoat(run,bad);const actionRewards=run.awarded,result=P.finishBoat(run,bad);
assert.equal(result.cargoLost,1);assert.equal(result.cargoPenalty,Math.round((result.base+result.speed)/6));assert.equal(result.completion,result.base+result.speed-result.cargoPenalty);assert.equal(P.read('tide').balance-wallet,result.total);assert(result.total>=actionRewards,'lost cargo does not debit points already earned for actions');assert.equal(P.finishBoat(run,bad),null,'finish cannot deduct or pay twice');assert.equal(P.read('tide').bestTimes['cargo:hard'],undefined,'partial cargo is not a full-manifest time record');

for(const difficulty of ['easy','medium','hard'])for(let lostCount=0;lostCount<=6;lostCount++){
 const s=T.create('cargo',difficulty);s.stage='complete';s.voyageTime=100;s.stats.cargoLost=lostCount;s.onboard=6-lostCount;
 const r=P.finishBoat(P.begin('tide'),s);assert.equal(r.cargoPenalty,Math.round((r.base+r.speed)*lostCount/6));assert(r.completion>=0);if(lostCount===6)assert.equal(r.completion,0,'losing every box awards no cargo completion bonus');
}
const cruise=T.create('cruise','hard');cruise.stage='complete';cruise.voyageTime=100;const cr=P.finishBoat(P.begin('tide'),cruise);assert.equal(cr.cargoPenalty,0);assert.equal(cr.completion,cr.base+cr.speed);
console.log('PASS unsnapped release and friction, persistent placement, regrabbing/rebalancing, reward deduplication, wave-driven cargo loss, partial deliveries, and bounded per-voyage penalties in all difficulties');
