'use strict';
const assert = require('node:assert/strict');
const Tide = require('./tide-physics.js'), C = Tide.Crane;
const tick = (s, input = {}) => Tide.step(s, input, 1/60);
function until(s, predicate, controls, timeout=15) {
  for(let i=0;i<timeout*60;i++){if(predicate())return;tick(s,typeof controls==='function'?controls():controls);}
  assert(predicate(),`Crane operation timed out: ${JSON.stringify({x:s.crane.x,hook:C.hook(s.crane),length:s.crane.length,angle:s.crane.angle,held:s.crane.held,blocked:s.crane.blocked,boxes:s.crane.boxes})}`);
}
function lift(s) { until(s,()=>s.crane.length<36.05,{up:true},5); }
function traverse(s,x) {
  until(s,()=>Math.abs(s.crane.x-x)<.8&&Math.abs(s.crane.vx)<2,()=>{
    const desired=Tide.clamp((x-s.crane.x)*3,-78,78);
    return {right:s.crane.vx<desired-1,left:s.crane.vx>desired+1};
  },15);
  until(s,()=>Math.abs(C.hook(s.crane).x-x)<2&&Math.abs(s.crane.omega)<.025,{},10);
}
function loadCargo(s, depart=true) {
  assert(s.crane,'cargo crane required');
  while(s.onboard<6){
    const c=s.crane,box=c.boxes.filter(b=>b.status==='dock').sort((a,b)=>b.y-a.y)[0];
    assert(box,'an unloaded container remains recoverable');
    lift(s);traverse(s,box.x);
    until(s,()=>C.grabCandidate(c)?.id===box.id,{down:true},5);
    assert(Tide.craneAction(s),'hook grabs a real dock box');
    lift(s);
    const n=s.onboard,slot={x:c.origin-47+(n%3)*49,y:26+Math.floor(n/3)*31};traverse(s,slot.x);
    until(s,()=>c.boxes[c.held].y<slot.y+13,{down:true},5);
    // Let the winch stop so a released container carries the actual settled velocity.
    for(let i=0;i<45;i++)tick(s);
    const previous=s.onboard;assert(Tide.craneAction(s),'hook releases the cargo');
    until(s,()=>s.onboard===previous+1,{},4);
  }
  assert.equal(s.stage,'loading','player explicitly leaves the crane');
  until(s,()=>C.ready(s.crane),{},5);if(depart){tick(s,{interact:true});assert.equal(s.stage,'sailing');}
}
module.exports={loadCargo,lift,traverse,until};

if(require.main===module){
  const idle=Tide.create();for(let i=0;i<300;i++)tick(idle,{interact:true,right:true});assert.equal(idle.onboard,0,'E no longer auto-loads cargo');assert.equal(idle.ship.x,idle.source);assert.equal(idle.stage,'loading');assert.equal(idle.voyageTime,0);
  const initial=Tide.create();const x=initial.crane.x;for(let i=0;i<60;i++)tick(initial,{up:true});assert(initial.crane.length<80);assert.equal(initial.crane.x,x,'W only hoists');for(let i=0;i<120;i++)tick(initial,{down:true});assert(initial.crane.length>80);assert.equal(initial.ship.vx,0);
  const pick=Tide.create();until(pick,()=>!!C.grabCandidate(pick.crane),{down:true});const b=C.grabCandidate(pick.crane),position={x:b.x,y:b.y};assert(Tide.craneAction(pick));assert.equal(pick.crane.held,b.id);tick(pick);assert(Math.hypot(b.x-position.x,b.y-position.y)<2,'grab is continuous');assert.equal(pick.onboard,0,'suspended cargo is not counted');
  lift(pick);for(let i=0;i<65;i++)tick(pick,{left:true});assert(Math.abs(pick.crane.angle)>.08,'trolley acceleration makes the load swing');assert(Math.abs(C.hook(pick.crane).x-pick.crane.x)>4,'load lags behind trolley');const angle=pick.crane.angle;for(let i=0;i<20;i++)tick(pick);assert(Math.abs(pick.crane.angle-angle)>.01,'swing continues after letting go');const peak=Math.abs(pick.crane.angle);for(let i=0;i<600;i++)tick(pick);assert(Math.abs(pick.crane.angle)<Math.max(.02,peak*.15),'swing gradually damps');
  // A high drop in the gap misses the ship and is recovered without resetting loaded progress.
  lift(pick);traverse(pick,pick.source+140);assert(Tide.craneAction(pick));const drop=pick.crane.boxes[b.id];assert.equal(drop.status,'falling');until(pick,()=>pick.crane.recovered>0,{},5);assert.equal(drop.status,'dock');assert.equal(pick.onboard,0);assert(drop.y>=C.geometry.dock);
  const loaded=Tide.create('cargo','hard');loadCargo(loaded);assert.equal(loaded.onboard,6);assert.equal(loaded.load,1);assert(loaded.crane.boxes.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));assert(loaded.crane.boxes.every(b=>b.status==='loaded'));assert.equal(loaded.crane.held,null);const beforeX=loaded.ship.x;for(let i=0;i<120;i++)tick(loaded,{right:true});assert(loaded.ship.x>beforeX+30,'ship controls unlock after loading');assert.equal(Tide.craneAction(loaded),false,'Space cannot unload cargo at sea');
  const cruise=Tide.create('cruise');assert.equal(cruise.crane,null);for(let i=0;i<250;i++)tick(cruise,{interact:true});assert.equal(cruise.stage,'sailing');assert.equal(cruise.onboard,24);
  console.log('PASS manual crane controls, mooring, physical grabs, pendulum lag/swing/damping, missed-drop recovery, six free placements, explicit departure, and cruise boarding');
}
