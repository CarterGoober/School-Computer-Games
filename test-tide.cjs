'use strict';
const assert = require('node:assert/strict');
const T = require('./tide-physics.js');
const advance = (s, seconds, controls = {}) => { for (let i=0;i<Math.ceil(seconds*60);i++) T.step(s,typeof controls==='function'?controls(s,i):controls,1/60); };
function atSea(vessel='cargo',difficulty='easy',seed=42) { const s=T.create(vessel,difficulty,seed);advance(s,5,{interact:true});s.ship.x=1800;s.eventIn=s.waveIn=1e6;return s; }

// Loading is an actual interaction. Delivery needs a slow approach inside the berth.
for (const vessel of ['cargo','cruise']) {
  const s=T.create(vessel,'easy',7);advance(s,6,{right:true});assert.equal(s.stage,'loading');assert.equal(s.ship.x,200);assert.equal(s.onboard,0);
  advance(s,5,{interact:true});assert.equal(s.stage,'sailing');assert.equal(s.onboard,s.spec.capacity);
  advance(s,2,{interact:true});assert.equal(s.unload,0,'cannot deliver at the departure dock');
  s.ship.x=s.destination;s.ship.vx=90;T.step(s,{interact:true});assert.equal(s.unload,0,'cannot unload at speed');
  advance(s,2,{brake:true});advance(s,4,{interact:true});assert.equal(s.stage,'complete');assert(s.score>1000);
  const frozen=s.time;advance(s,4,{right:true});assert.equal(s.time,frozen,'completed voyages stop simulation');
}
console.log('PASS loading, slow docking, complete manifests, scoring, and completed-state freeze');

const engine=atSea('cruise','hard');assert(T.triggerIncident(engine,'engine'));const x=engine.ship.x;advance(engine,1,{right:true});assert.equal(engine.ship.x,x,'broken engine cannot accelerate');
for(let i=0;i<engine.config.restartTaps-1;i++)T.tapRestart(engine);assert(!engine.ship.engine);T.tapRestart(engine);assert(engine.ship.engine);assert.equal(engine.stats.restarts,1);
assert(T.triggerIncident(engine,'overboard'));assert.equal(engine.onboard,23);advance(engine,2.5,{interact:true});assert.equal(engine.swimmer,null);assert.equal(engine.onboard,24);assert.equal(engine.stats.rescues,1);
const rescue=atSea('cruise');T.triggerIncident(rescue,'overboard');rescue.ship.x+=600;advance(rescue,3,{interact:true});assert.equal(rescue.swimmer.progress,0,'cannot rescue from a distance');rescue.ship.x=rescue.swimmer.x;rescue.ship.vx=70;T.step(rescue,{interact:true});assert.equal(rescue.swimmer.progress,0,'cannot rescue at speed');
rescue.ship.x=rescue.destination;rescue.ship.vx=0;advance(rescue,4,{interact:true});assert.equal(rescue.unload,0,'passenger must be rescued before delivery');advance(rescue,60);assert.equal(rescue.stage,'failed');assert.match(rescue.failure,/passenger/);
console.log('PASS engine failures and repeated restart taps, nearby slow rescues, and missed-rescue failure');

const cannon=atSea('cargo');T.triggerIncident(cannon,'pirates');cannon.pirates[0].x=cannon.ship.x-280;advance(cannon,2,{cannon:true});assert.equal(cannon.stats.pirates,1);assert(cannon.ship.pressure<100);const pressure=cannon.ship.pressure;advance(cannon,1);assert(cannon.ship.pressure>pressure);
const gun=atSea('cargo','hard');T.triggerIncident(gun,'pirates');gun.pirates=gun.pirates.slice(0,1);gun.pirates[0].x=gun.ship.x+300;
advance(gun,4,s=>({fire:true,aim:{x:s.pirates[0]?.x||s.ship.x+300,y:(s.pirates[0]?.y||0)+17}}));assert.equal(gun.stats.pirates,1);assert(gun.stats.shots>0);
const boarded=atSea();T.triggerIncident(boarded,'pirates');boarded.pirates[0].x=boarded.ship.x-210;advance(boarded,30);assert.equal(boarded.stage,'failed');assert.match(boarded.failure,/boarded/);
assert(!T.fire(atSea('cruise'),{x:3000,y:10}),'cruise ship has no deck gun');
console.log('PASS cursor-aimed projectiles, water cannons, pressure recharge, and pirate boarding failure');

function impact(speed) { const s=atSea('cargo','hard');s.ship.vx=speed;const w=T.spawnWave(s,true);w.x=s.ship.x+65;T.step(s);return s; }
const slow=impact(0),fast=impact(106);assert(slow.stats.damage<fast.stats.damage*.3,'braking materially reduces wave damage');assert(fast.ship.vx<70,'large waves slow the ship');
const before=slow.stats.damage;advance(slow,1);assert.equal(slow.stats.damage,before,'a wave damages once, not every frame');
const sunk=atSea('cargo','hard');sunk.ship.hull=3;sunk.ship.vx=100;T.spawnWave(sunk,true).x=sunk.ship.x;T.step(sunk);assert.equal(sunk.stage,'failed');assert.equal(sunk.ship.hull,0);
const repaired=atSea('cargo','medium');repaired.ship.hull=45;advance(repaired,3.2,{repair:true});assert.equal(repaired.ship.hull,80);assert.equal(repaired.repairKits,1);repaired.ship.vx=100;advance(repaired,.5,{repair:true,right:true});assert.equal(repaired.repair,0,'cannot repair at speed');
const protectedHarbor=T.create();advance(protectedHarbor,5,{interact:true});protectedHarbor.ship.x=protectedHarbor.destination;T.spawnWave(protectedHarbor,true).x=protectedHarbor.ship.x;T.step(protectedHarbor);assert.equal(protectedHarbor.ship.hull,100);
console.log('PASS speed-dependent wave damage, single impacts, sinking, repairs, and sheltered docks');

// A human-like control policy completes every combination using normal mission transitions.
function pilot(s,frame) {
  if(s.stage==='loading')return{interact:true};
  if(!s.ship.engine && frame%6===0)T.tapRestart(s);
  const active=s.pirates.find(p=>p.hp>0),c={cannon:!!active,fire:!!active,aim:active?{x:active.x,y:active.y+17}:null};
  if(s.swimmer){const dx=s.swimmer.x-s.ship.x;if(Math.abs(dx)<s.spec.length/2+75){c.brake=true;c.interact=true;}else if(dx<0)c.left=true;else c.right=true;return c;}
  if((s.ship.hull<62||s.repair>0)&&s.repairKits){c.brake=true;c.repair=true;return c;}
  if(s.waves.some(w=>!w.hit&&w.x-s.ship.x<580&&w.x-s.ship.x>-w.width)){c.brake=true;return c;}
  const dx=s.destination-s.ship.x;
  if(Math.abs(dx)<100){c.brake=true;c.interact=true;}
  else if(dx<0)c.left=true;
  else{c.right=true;if(dx<175&&s.ship.vx>45)c.brake=true;}
  return c;
}
for(const vessel of ['cargo','cruise'])for(const difficulty of ['easy','medium','hard'])for(const seed of [13,92]){
  const s=T.create(vessel,difficulty,seed);let maxVertical=0,previousY=0;
  for(let i=0;i<60*240&&s.stage!=='complete'&&s.stage!=='failed';i++){T.step(s,pilot(s,i),1/60);maxVertical=Math.max(maxVertical,Math.abs(s.ship.y-previousY));previousY=s.ship.y;assert(Number.isFinite(s.ship.y)&&Number.isFinite(s.ship.angle));}
  assert.equal(s.stage,'complete',`${vessel}/${difficulty}/${seed}: ${s.failure} at ${Math.round(s.ship.x)}m, ${Math.round(s.voyageTime)}s`);assert(s.stats.events>0);assert(s.stats.waves>0);assert(maxVertical<7,'buoyancy stays continuous through rough seas');
  if(vessel==='cruise'){assert(s.stats.restarts>0);assert(s.stats.rescues>0);}
  console.log(`PASS ${vessel}/${difficulty} seed ${seed}: ${Math.round(s.voyageTime)}s, ${Math.round(s.ship.hull)}% hull, ${s.stats.events} incidents, ${s.stats.waves} waves`);
}
// Equal time at sea gives objectively more incidents and waves on harder settings.
const counts=[];
for(const difficulty of ['easy','medium','hard']){
  const s=atSea('cruise',difficulty,123);s.eventIn=1;s.waveIn=1;
  for(let i=0;i<120*60;i++){s.ship.hull=100;if(!s.ship.engine&&i%6===0)T.tapRestart(s);T.step(s,{brake:true,interact:true});}
  counts.push([s.stats.events,s.stats.waves,s.stats.tsunamis]);
}
for(let i=1;i<3;i++){assert(counts[i][0]>counts[i-1][0]);assert(counts[i][1]>counts[i-1][1]);assert(counts[i][2]>counts[i-1][2]);}
console.log('PASS increasing incident, wave, and tsunami frequency:',counts);
