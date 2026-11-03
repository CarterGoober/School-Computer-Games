'use strict';
const assert=require('node:assert/strict'),P=require('./physics.js');const flat=()=>0;
let s=P.spawn(flat);for(let i=0;i<600;i++)P.step(s,{brake:true},1/120,flat);let low=Infinity,high=-Infinity;for(let i=0;i<600;i++){P.step(s,{brake:true},1/120,flat);low=Math.min(low,s.y);high=Math.max(high,s.y);assert(s.wheels.every(w=>w.suspensionLength>=.21-1e-5&&w.suspensionLength<=.65+1e-5));}assert(high-low<.005,'resting suspension does not jitter');
const uneven=(x,z)=>.35*Math.sin(x*.5+z*.25);s=P.spawn(uneven);for(let i=0;i<3600;i++){P.step(s,{up:i%600<400,left:i%900<90,brake:i%600>=400},1/120,uneven);assert([s.x,s.y,s.z,...s.q,...s.angular].every(Number.isFinite));assert(s.wheels.every(w=>w.suspensionLength>=.21-1e-5&&w.suspensionLength<=.65+1e-5),'wheels remain attached over uneven ground');}
console.log('PASS resting jitter, finite force simulation and bounded suspension attachment',{restJitter:high-low});
