'use strict';
const assert = require('node:assert/strict');
const D = require('./drift-physics.js');
const dt = 1 / 120;
const angle = (x, z) => Math.atan2(x, z);
const difference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function controller(car, track, speed = 20) {
 const surface = D.surfaceAt(track, car.x, car.z, car.surfaceIndex);
 const target = track.samples[(surface.index + 4) % track.samples.length];
 const delta = difference(angle(target.x - car.x, target.z - car.z), car.heading);
 return {up: car.speed < speed, down: car.speed > speed + 1, left: delta < -.035, right: delta > .035};
}

// A sideways slide must become forward flight, including when steering stays held.
for (let vehicle = 0; vehicle < 4; vehicle++) {
 const track = D.createTrack(0), car = D.spawn(track, vehicle);
 const ramp = track.ramps[0], lip = track.samples[ramp.end];
 car.heading = angle(lip.dx, lip.dz) + .09;
 car.x = lip.x - Math.sin(car.heading) * .08;
 car.z = lip.z - Math.cos(car.heading) * .08;
 car.surfaceIndex = ramp.end - 1;
 car.y = D.nearest(track, car.x, car.z).y + .42;
 car.vx = Math.sin(car.heading) * 24 + Math.cos(car.heading) * 9;
 car.vz = Math.cos(car.heading) * 24 - Math.sin(car.heading) * 9;
 const beforeY = car.y;
 assert.equal(D.step(car, track, {}, dt), 'jump');
 assert(Math.abs(car.y - beforeY) < .03, 'Takeoff must not teleport vertically');
 const heading = car.heading, vx = car.vx, vz = car.vz;
 assert(Math.abs(difference(angle(vx, vz), heading)) < 1e-9, 'Flight must follow takeoff heading, not lateral slip');
 let landing = false;
 for (let i = 0; i < 240 && car.airborne; i++) {
  const oldY = car.y;
  const event = D.step(car, track, {right: true, up: true, brake: true}, dt);
  assert.equal(car.heading, heading, 'Held steering must not twist the vehicle away from its flight path');
  assert.equal(car.vx, vx, 'Horizontal flight velocity must stay constant');
  assert.equal(car.vz, vz);
  assert(Math.abs(car.y - oldY) < .16, 'Air motion and touchdown must be continuous');
  if (event === 'landing') landing = true;
 }
 assert(landing, 'Must land');
 assert(car.airtime < 1.05, 'Jump arc must be shorter than the old oversized launch');
 console.log('PASS aligned, stable flight and smooth landing:', D.vehicles[vehicle].id);
}

// Wagons have independent inertia and delayed body yaw instead of rigidly following the drawbar.
for (const direction of ['left', 'right']) {
 const track = D.createTrack(0), car = D.spawn(track, 2);
 for (let i = 0; i < 220; i++) D.step(car, track, {up: true}, dt);
 const slips = [0, 0], yawLag = [0, 0];
 for (let i = 0; i < 120; i++) {
  D.step(car, track, {up: true, brake: true, [direction]: true}, dt);
  let parent = car;
  car.wagons.forEach((w, index) => {
   assert(Math.abs(Math.hypot(parent.x - w.x, parent.z - w.z) - 4.2) < .001, 'Coupling length stays stable');
   slips[index] = Math.max(slips[index], w.driftAngle);
   yawLag[index] = Math.max(yawLag[index], Math.abs(difference(angle(parent.x-w.x, parent.z-w.z), w.heading)));
   assert(Number.isFinite(w.vx + w.vz + w.y + w.pitch));
   parent = w;
  });
 }
 assert(slips.every(value => value > .15), 'Both cargo cars must slide sideways');
 assert(yawLag.every(value => value > .05), 'Cargo cars must swing independently of the hitch direction');
 console.log('PASS both cargo cars drift with coupled inertia:', direction);
}

// Crossed road projections at different heights must not flip the selected support.
{
 const lower = {x:-10,y:0,z:0,dx:20,dz:0,len:20,s:0};
 const lowerEnd = {x:10,y:0,z:0,dx:0,dz:10,len:10,s:20};
 const spacer = Array.from({length:30}, (_,i)=>({x:100+i,y:0,z:100,dx:1,dz:0,len:1,s:30+i}));
 const upper = {x:0,y:12,z:-10,dx:0,dz:20,len:20,s:60};
 const upperEnd = {x:0,y:12,z:10,dx:1,dz:0,len:1,s:80};
 const track = {samples:[lower,lowerEnd,...spacer,upper,upperEnd],width:10,length:81};
 assert.equal(D.surfaceAt(track,0,0,32).y,12, 'Stay on elevated branch at a crossing');
 assert.equal(D.surfaceAt(track,0,0,0).y,0, 'Stay on lower branch at a crossing');
 console.log('PASS elevation continuity at overlapping road projections');
}

// Measure real hill/ramp traversal, including each wagon's independently supported height.
for (const route of [0,4]) {
 const track = D.createTrack(route), car = D.spawn(track,2);
 let maxStep = 0, maxPitch = 0, airborneWagons = 0;
 for (let i=0;i<120*160&&!car.finished;i++) {
  const previous = [car,...car.wagons].map(b=>({y:b.y,pitch:b.pitch}));
  D.step(car,track,controller(car,track,19),dt);
  [car,...car.wagons].forEach((body,index)=>{
   maxStep=Math.max(maxStep,Math.abs(body.y-previous[index].y));
   maxPitch=Math.max(maxPitch,Math.abs(body.pitch-previous[index].pitch));
   assert(Number.isFinite(body.y+body.pitch));
  });
  if (car.wagons.some(w=>w.airborne)) airborneWagons++;
 }
 assert(car.finished, 'Train must complete elevated circuit');
 assert(maxStep < .2, `Vertical movement must stay smooth: ${maxStep}`);
 assert(maxPitch < .065, 'Pitch must change smoothly');
 if(track.ramps.length) assert(airborneWagons>0, 'Cargo cars cross ramps and land on their own suspension');
 console.log(`PASS elevated train ride: ${track.name}, largest vertical step ${maxStep.toFixed(3)}m`);
}
