'use strict';
const assert=require('node:assert/strict'),W=require('./world.js'),P=require('./physics.js');
assert(W.rockTrails?.length>=3,'three fixed rocky routes should connect to the existing landscape');
for(const trail of W.rockTrails){
 const pts=trail.points;let s=P.spawn(W.height,...pts[0],Math.atan2(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1])),index=1,maxMove=0,maxRise=0,maxRoll=0,maxContactError=0,ticks=0;
 for(;ticks<40000&&index<pts.length;ticks++){
  const target=pts[index];if(Math.hypot(target[0]-s.x,target[1]-s.z)<7){index++;continue;}
  const angle=Math.atan2(Math.sin(Math.atan2(target[0]-s.x,target[1]-s.z)-s.heading),Math.cos(Math.atan2(target[0]-s.x,target[1]-s.z)-s.heading));
  const before={...s};P.step(s,{gear:1,up:s.speed<3,left:angle<-.035,right:angle>.035,brake:s.speed>4},1/120,W.height,W.obstacles);
  maxMove=Math.max(maxMove,Math.hypot(s.x-before.x,s.z-before.z));maxRise=Math.max(maxRise,Math.abs(s.y-before.y));maxRoll=Math.max(maxRoll,Math.abs(s.roll));for(const w of s.wheels){if(w.contactPoint&&w.contactNormal){const separation=(w.x-w.contactPoint[0])*w.contactNormal[0]+(w.y-w.contactPoint[1])*w.contactNormal[1]+(w.z-w.contactPoint[2])*w.contactNormal[2];maxContactError=Math.max(maxContactError,.48-separation);}};
  assert(Number.isFinite(s.y));
 }
 console.log('CONTACT',trail.name,{maxContactError,maxRise,maxMove});assert.equal(index,pts.length,trail.name+' can be driven end to end');assert(maxMove<.06,trail.name+' has no collision teleports');assert(maxRise<.08,trail.name+' has no vertical kicks');assert(maxContactError<.10,trail.name+' wheels remain on rock');
 const mid=pts[Math.floor(pts.length/2)];assert.equal(W.surface(...mid).kind,'rock');
 console.log('PASS',trail.name,{seconds:Math.round(ticks/120),maxMove,maxRise,maxRoll,maxContactError});
}
