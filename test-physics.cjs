'use strict';
const assert=require('node:assert/strict');
const {createTrack,spawn,step,nearest,recover,formatTime}=require('./physics.js');
const track=createTrack(0),car=spawn(track);
for(let i=0;i<120;i++)step(car,track,{up:true},1/120);
assert(car.speed>10,'Throttle must accelerate');assert(car.z>5,'Acceleration must move car');
const heading=car.heading;for(let i=0;i<60;i++)step(car,track,{up:true,right:true},1/120);assert(car.heading>heading,'Right steering must turn right');
const t=car.time;recover(car,track);assert.equal(car.speed,0);assert.equal(car.time,t+2);assert(nearest(track,car.x,car.z).distance<.01,'Recovery must return to road');
assert.equal(formatTime(65.4321),'01:05.432');assert.equal(formatTime(Infinity),'—');
for(let id=0;id<3;id++){
 const circuit=createTrack(id),driver=spawn(circuit);let checkpoints=0;
 // A steering controller drives through the real simulation, without changing car position or progress.
 for(let i=0;i<120*180&&!driver.finished;i++){
  const near=nearest(circuit,driver.x,driver.z),target=circuit.samples[(near.index+4)%circuit.samples.length];
  const desired=Math.atan2(target.x-driver.x,target.z-driver.z),delta=Math.atan2(Math.sin(desired-driver.heading),Math.cos(desired-driver.heading));
  const event=step(driver,circuit,{up:driver.speed<18,down:driver.speed>19,left:delta<-.035,right:delta>.035},1/120);
  if(event==='checkpoint')checkpoints++;
 }
 assert(driver.finished,`${circuit.name}: steering controller must finish a full lap`);assert.equal(checkpoints,4,'All checkpoints must execute');assert(driver.time>20,'Lap timer must advance');console.log(`PASS ${circuit.name}: ${formatTime(driver.time)}, all 4 checkpoints`);
}
const unfinished=spawn(track);unfinished.lastProgress=.99;unfinished.nextCheckpoint=0;step(unfinished,track,{up:true},1/120);assert(!unfinished.finished,'Crossing start without checkpoints must not finish');
console.log('PASS acceleration, steering, recovery penalty, time formatting, checkpoint enforcement');
