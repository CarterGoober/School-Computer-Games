'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('./drift-physics.js');
const sandbox={window:{},Drift:D};vm.runInNewContext(fs.readFileSync('urban-scene.js','utf8'),sandbox);
for(let id=0;id<5;id++){
 const track=D.createTrack(id),scene=sandbox.window.buildUrbanScene(track);
 assert(scene.counts.building>10&&scene.counts.lamp>10,'District must include buildings and street lights');
 for(const mesh of scene.meshes)for(const face of mesh.faces)for(const p of face.points)assert(Number.isFinite(p.x+p.y+p.z),'Finite scenery vertices');
 for(const o of track.sceneryObstacles)for(const p of track.samples)assert(Math.hypot(o.x-p.x,o.z-p.z)>o.radius+1.5,'Buildings must not block the route');
 if(id===3){assert.equal(scene.counts.boat,3);assert.equal(scene.counts.crane,3);assert.equal(scene.counts.water,1);assert(scene.counts.container>0,'Port must have cargo stacks');const car=D.spawn(track);car.x=track.shore+3;car.z=40;assert.equal(D.step(car,track,{},1/120),'recovered','Entering water recovers to road')}
 if(id===4)assert(scene.counts.container>0,'Industrial district has containers');
 for(let vehicle=0;vehicle<4;vehicle++){
  const car=D.spawn(track,vehicle);let collisions=0;
  for(let i=0;i<120*180&&!car.finished;i++){
   const n=D.surfaceAt(track,car.x,car.z,car.surfaceIndex),target=track.samples[(n.index+4)%track.samples.length],a=Math.atan2(target.x-car.x,target.z-car.z),delta=Math.atan2(Math.sin(a-car.heading),Math.cos(a-car.heading));
   const event=D.step(car,track,{up:car.speed<16,down:car.speed>17,left:delta<-.035,right:delta>.035},1/120);if(event==='collision')collisions++;
  }
  assert(car.finished,`${track.name}: every vehicle must finish with scenery collisions enabled`);assert.equal(car.nextCheckpoint,4);assert.equal(collisions,0,'A centered driving line must clear obstacles');
 }
 console.log('PASS district scenery and four complete laps:',track.name,JSON.stringify(scene.counts));
}
const eight=D.createTrack(0),under=eight.samples[3*24],over=eight.samples[9*24];
assert(Math.hypot(under.x-over.x,under.z-over.z)<.01,'Figure eight must cross itself');
assert(over.y-under.y>6,'Overpass must have clearance');
assert(D.surfaceAt(eight,under.x,under.z,3*24).y<.1,'Keep lower road support');
assert(D.surfaceAt(eight,over.x,over.z,9*24).y>6,'Keep upper road support');
console.log('PASS figure-eight crossing and overpass continuity');
