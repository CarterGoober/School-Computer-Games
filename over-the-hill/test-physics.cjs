'use strict';
const assert=require('node:assert/strict');
const P=require('./physics.js');
assert.equal(typeof P.step,'function');assert.equal(Object.assign({motionHeading:2},P.spawn(()=>0,0,0,-1)).motionHeading,-1,'recovery resets lateral travel direction on both server implementations');
const flat=()=>0;
let s=P.spawn(flat,0,0,0);
for(let i=0;i<600;i++)P.step(s,{},1/120,flat,[]);
assert(Math.abs(s.y-.86)<.03,'springs settle at ride height');
for(let i=0;i<600;i++)P.step(s,{up:true},1/120,flat,[]);
assert(s.z>30&&s.speed>8,'accelerates');
for(let i=0;i<240;i++)P.step(s,{brake:true},1/120,flat,[]);
assert(Math.abs(s.speed)<.1,'brakes to rest');
for(let i=0;i<240;i++)P.step(s,{down:true,left:true},1/120,flat,[]);
assert(s.speed<0&&s.heading>0,'reverse steering');
s=P.spawn((x,z)=>x*.12+z*.15,0,0,0);
for(let i=0;i<600;i++)P.step(s,{brake:true},1/120,(x,z)=>x*.12+z*.15,[]);
assert(s.pitch>.1&&s.roll>.08,'body follows both slopes');
assert(Math.max(...s.wheels.map(w=>w.y))-Math.min(...s.wheels.map(w=>w.y))>.4,'independent wheel contacts');
s=P.spawn(flat,0,0,0);for(let i=0;i<20000;i++)P.step(s,{up:i%900<600,left:i%800<300},1/120,(x,z)=>2*Math.sin(z*.12)+Math.sin(x*.2),[]);
assert([s.x,s.y,s.z,s.pitch,s.roll,s.speed].every(Number.isFinite),'long-run stability');for(const w of s.wheels){const anchor=s.y-.35+w.lz*Math.sin(s.pitch)+w.lx*Math.sin(s.roll);assert(w.y>=anchor-.271&&w.y<=anchor+.241,'physical wheel stays within suspension travel');assert(w.y>=w.groundY-.04,'tires do not sink into ground');}
for(const [control,sign] of [['left',-1],['right',1]]){const v=P.spawn(flat);for(let i=0;i<180;i++)P.step(v,{up:true,[control]:true},1/120,flat,[]);assert(v.x*sign>1,'actual '+control+' movement must match control');}
for(let i=0;i<12;i++){const a=i/12*Math.PI*2,v=P.spawn(flat,Math.cos(a)*20,Math.sin(a)*15);P.step(v,{},1/120,flat,[{x:0,z:0,r:40,rx:40,rz:33}]);assert(Math.hypot(v.x/41.25,v.z/34.25)>.999,'elliptical deep water stays solid at every shore angle');}
console.log('PASS Over the Hill spring settling, acceleration, braking, reverse steering, slope articulation and long-run stability');
