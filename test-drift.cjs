'use strict';
const assert=require('node:assert/strict'),D=require('./drift-physics.js');
assert.equal(D.definitions.length,5);assert.equal(D.vehicles.length,4);
const input={up:true};
for(let vehicleId=0;vehicleId<4;vehicleId++){const track=D.createTrack(0),car=D.spawn(track,vehicleId);for(let i=0;i<180;i++)D.step(car,track,input,1/120);assert(car.speed>10,'Each vehicle accelerates');assert(car.z>8,'Each vehicle moves');const heading=car.heading;for(let i=0;i<75;i++)D.step(car,track,{up:true,right:true,brake:true},1/120);assert(car.heading>heading,'Steering responds');assert(car.driftScore>0,'Handbrake turn earns drift points');if(vehicleId===2){assert.equal(car.wagons.length,2);assert(Math.abs(Math.hypot(car.x-car.wagons[0].x,car.z-car.wagons[0].z)-4.2)<.01,'Train wagon follows hitch')}D.recover(car,track);assert.equal(car.vx,0);assert.equal(car.airborne,false);console.log('PASS vehicle handling, drift scoring, and recovery:',D.vehicles[vehicleId].name)}
for(let vehicleId=0;vehicleId<4;vehicleId++)for(let id=0;id<5;id++){
 const track=D.createTrack(id),car=D.spawn(track,vehicleId);let checkpoints=0,jumps=0,landings=0;
 for(let i=0;i<120*200&&!car.finished;i++){
  const n=D.nearest(track,car.x,car.z),target=track.samples[(n.index+4)%track.samples.length],desired=Math.atan2(target.x-car.x,target.z-car.z),delta=Math.atan2(Math.sin(desired-car.heading),Math.cos(desired-car.heading));
  const e=D.step(car,track,{up:car.speed<16,down:car.speed>17,left:delta<-.035,right:delta>.035},1/120);
  if(e==='checkpoint')checkpoints++;if(e==='jump')jumps++;if(e==='landing')landings++;
 }
 assert(car.finished,`${track.name}: finish through driving simulation`);assert.equal(car.nextCheckpoint,4);if(track.ramps.length){assert(jumps>0,`${track.name}: launch from ramps`);assert(landings>0,`${track.name}: land`);assert(car.totalAir>0);assert(car.driftScore>0)}
 console.log(`PASS ${D.vehicles[vehicleId].id} / ${track.name}: ${D.formatTime(car.time)}, ${jumps} jumps, ${landings} landings, ${Math.floor(car.driftScore)} style`);
}
const track=D.createTrack(0),car=D.spawn(track);const obstacle=track.obstacles[0];car.x=obstacle.x+.3;car.z=obstacle.z;car.y=obstacle.y+.42;car.vz=15;assert.equal(D.step(car,track,{},1/120),'collision');assert(car.time>1,'Collision adds time');assert(car.collisionCooldown>0);assert(!car.finished);console.log('PASS obstacle collision and penalty');
