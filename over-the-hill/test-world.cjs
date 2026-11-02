'use strict';
const assert=require('node:assert/strict'),P=require('./physics.js'),W=require('./world.js');
let s=P.spawn(W.height,0,-45,0),index=W.nearest(0,-45,true).i,passed=0,maxError=0,maxPitch=0;
for(let tick=0;tick<120*400&&passed<W.route.length;tick++){
 const next=W.route[(index+1)%W.route.length];if(Math.hypot(s.x-next.x,s.z-next.z)<5){index=(index+1)%W.route.length;passed++;}
 const target=W.route[(index+3)%W.route.length],desired=Math.atan2(target.x-s.x,target.z-s.z),angle=Math.atan2(Math.sin(desired-s.heading),Math.cos(desired-s.heading));
 P.step(s,{up:s.speed<5,left:angle<-.045,right:angle>.045,brake:s.speed>6},1/120,W.height,W.obstacles);
 maxError=Math.max(maxError,W.nearest(s.x,s.z).distance);maxPitch=Math.max(maxPitch,Math.abs(s.pitch));
 assert(s.y>W.height(s.x,s.z)-.1,'chassis stays above terrain');assert(Math.abs(s.roll)<.6,'roll bounded');
}
assert(passed>=W.route.length,'continuous loop traversable: '+passed+'/'+W.route.length);assert(maxError<9,'route clearance');assert(maxPitch>.12,'meaningful elevation');
console.log('PASS complete forest/mountain loop via physics and obstacles; max trail deviation',maxError.toFixed(1),'m, pitch',maxPitch.toFixed(2));
