'use strict';
const assert=require('node:assert/strict'),T=require('./tide-physics.js');
const tick=(s,input={},n=1)=>{for(let i=0;i<n;i++)T.step(s,input,1/60);};
const s=T.create('cruise','hard');assert(T.boardingPassengers(s).every(p=>!p.aboard));tick(s,{interact:true},100);
const passengers=T.boardingPassengers(s);assert(passengers.some(p=>p.progress>0&&p.progress<1));assert.equal(passengers.filter(p=>p.aboard).length,s.onboard);assert(s.onboard>0&&s.onboard<24);
const walking=passengers.find(p=>p.progress>.3&&p.progress<.9);assert(walking.y<-7&&walking.x>-245&&walking.x<-137,'passengers climb the gangway toward the door');const progress=s.load,phase=s.boardingTime;tick(s,{},60);assert.equal(s.load,progress);assert.equal(s.boardingTime,phase,'letting go pauses footsteps');tick(s,{interact:true},160);assert.equal(s.onboard,24);assert.equal(s.stage,'sailing');
// Drive out, let a passenger fall, overshoot, and use real reverse/brake controls to return.
s.eventIn=s.waveIn=9999;tick(s,{right:true},500);assert(s.ship.vx>100);assert(T.triggerIncident(s,'overboard'));const swimmer=s.swimmer.x;tick(s,{right:true},90);assert(s.ship.x>swimmer+T.vessels.cruise.length/2+95);
tick(s,{brake:true},90);const farX=s.ship.x;let astern=false;
for(let i=0;i<900&&s.swimmer;i++){
 const near=Math.abs(s.ship.x-swimmer)<225;
 tick(s,near?{brake:true,interact:true}:{left:true});if(s.ship.vx<-5)astern=true;
}
assert(astern,'A/left produces sustained reverse thrust');assert(s.ship.x<farX-50,'reverse returns to the passenger');assert.equal(s.swimmer,null);assert.equal(s.onboard,24);assert.equal(s.stats.rescues,1);assert.notEqual(s.stage,'failed');
console.log('PASS visible ramp travel, arrival-based manifest, paused boarding, and actual reverse rescue after overshooting');
