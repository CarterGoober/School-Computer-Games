'use strict';
const assert=require('node:assert/strict'),Cinema=require('./drift-cinematic.js'),D=require('./drift-physics.js');
for(const fps of [30,60,120])for(const flight of [.08,.25,.7,1.2]){
 const c=Cinema.create();Cinema.start(c);let real=0,sim=0,landedAt=null,fullView=0,previous=c.timeScale;
 while(c.phase!=='idle'&&real<10){const airborne=sim<flight;Cinema.update(c,1/fps,airborne);real+=1/fps;sim+=c.timeScale/fps;if(!airborne&&landedAt===null)landedAt=real;if(c.blend>.9)fullView+=1/fps;assert(Math.abs(c.timeScale-previous)<.09,'return to normal speed is gradual');previous=c.timeScale;}
 assert(real>=Cinema.minimumView+Cinema.fadeDuration-.01,'fast hops get the minimum viewing window');assert(fullView>1.25,'the camera has time to settle into its cinematic angle');assert(real-landedAt>=Cinema.landingHold+Cinema.fadeDuration-.04);assert.equal(c.phase,'idle');assert.equal(c.timeScale,1);
}
const paused=Cinema.create();Cinema.start(paused);Cinema.update(paused,.4,true);const snapshot=JSON.stringify(paused);Cinema.update(paused,8,false,true,false);assert.equal(JSON.stringify(paused),snapshot,'pausing does not use up viewing time');Cinema.update(paused,.1,true,false);assert.equal(paused.phase,'idle');assert.equal(paused.timeScale,1);Cinema.start(paused);Cinema.reset(paused);assert.equal(paused.phase,'idle','restart/recovery clears the camera hold');
function jump(speed,cinematic){
 const track=D.createTrack(0),car=D.spawn(track,3),ramp=track.ramps[0],lip=track.samples[ramp.end];
 car.heading=Math.atan2(lip.dx,lip.dz);car.x=lip.x-Math.sin(car.heading)*.08;car.z=lip.z-Math.cos(car.heading)*.08;car.surfaceIndex=ramp.end-1;car.y=D.nearest(track,car.x,car.z).y+.42;car.vx=Math.sin(car.heading)*speed;car.vz=Math.cos(car.heading)*speed;
 assert.equal(D.step(car,track,{},1/120),'jump');const c=Cinema.create();if(cinematic)Cinema.start(c);let accumulator=0,time=0;
 for(let i=0;i<1000;i++){Cinema.update(c,1/60,car.airborne,cinematic);time+=1/60;accumulator+=c.timeScale/60;while(accumulator>=1/120){const event=D.step(car,track,{},1/120);accumulator-=1/120;if(event==='landing')return{x:car.x,z:car.z,y:car.y,airtime:car.airtime,time,phase:c.phase};}}
 assert.fail('Ferrari must land');
}
for(const speed of [24,45,57]){const normal=jump(speed,false),cinematic=jump(speed,true);assert.equal(cinematic.x,normal.x);assert.equal(cinematic.z,normal.z);assert.equal(cinematic.y,normal.y);assert.equal(cinematic.airtime,normal.airtime);assert(cinematic.time>normal.time*2,'slow motion remains visible for fast Ferrari jumps');assert.notEqual(cinematic.phase,'idle');}
console.log('PASS real-time cinematic minimum, smooth camera/speed release, pause/off/recovery, and unchanged Ferrari jump landings at three speeds');
