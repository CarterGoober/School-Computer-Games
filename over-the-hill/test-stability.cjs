'use strict';
const assert=require('node:assert/strict'),P=require('./physics.js');
const flat=()=>0;
// Saved positions can overlap changed scenery: resolve gradually, never teleport.
const car=P.spawn(flat,0,0),obstacles=[{x:0,z:0,r:6},{x:-2,z:0,r:4}];
let maxMove=0;
for(let i=0;i<1800;i++){const before={x:car.x,z:car.z};P.step(car,{},1/120,flat,obstacles);maxMove=Math.max(maxMove,Math.hypot(car.x-before.x,car.z-before.z));}
assert(maxMove<=.02,'overlapping obstacles must not eject a vehicle in one step; observed '+maxMove.toFixed(2)+'m');
assert(Math.hypot(car.x,car.z)>=7.24,'a stationary overlapping vehicle gradually clears the obstacle');
const slope=(x,z)=>x*.3+z*.35,s=P.spawn(slope);let maxRise=0;
for(let i=0;i<600;i++){const y=s.y;P.step(s,{brake:true},1/120,slope);maxRise=Math.max(maxRise,Math.abs(s.y-y));}
assert(maxRise<.03,'spawning on a slope should not kick the chassis upward');
console.log('PASS bounded overlapping-obstacle recovery and settled slope spawn', {maxMove,maxRise});
