/* Original fixed-step off-road dynamics. Coordinates: metres, +Y up, +Z forward. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function contacts(s,height){const sn=Math.sin(s.heading),cs=Math.cos(s.heading);return [[-1,1.65],[1,1.65],[-1,-1.65],[1,-1.65]].map(([x,z])=>{const wx=s.x+x*cs+z*sn,wz=s.z+z*cs-x*sn;return{x:wx,z:wz,y:height(wx,wz)+.48,lx:x,lz:z};});}
function spawn(height,x=0,z=0,heading=0){const s={x,z,heading,motionHeading:heading,speed:0,steer:0,y:height(x,z)+.86,vy:0,pitch:0,pitchV:0,roll:0,rollV:0,travel:0,wheelSpin:0};s.wheels=contacts(s,height);limitTravel(s);return s;}
function spring(s,k,target,dt,stiff,damp){const v=k+'V';s[v]+=(stiff*(target-s[k])-damp*s[v])*dt;s[k]+=s[v]*dt;}
function limitTravel(s){for(const w of s.wheels){w.groundY=w.y;const anchor=s.y-.35+w.lz*Math.sin(s.pitch)+w.lx*Math.sin(s.roll);w.y=clamp(w.y,anchor-.27,anchor+.24);}}
function step(s,input,dt,height,obstacles=[]){
 dt=Math.min(dt,1/30);
 const steering=(input.left?-1:0)+(input.right?1:0);
 s.steer+=(steering*.53/(1+Math.abs(s.speed)*.035)-s.steer)*(1-Math.exp(-7*dt));
 const front=height(s.x+Math.sin(s.heading)*1.7,s.z+Math.cos(s.heading)*1.7),rear=height(s.x-Math.sin(s.heading)*1.7,s.z-Math.cos(s.heading)*1.7);
 const terrain=height.surface?height.surface(s.x,s.z):{depth:0,grip:1,resistance:.16},depth=terrain.depth;s.waterDepth=depth;s.chassisWaterDepth=Math.max(0,(terrain.level??-10000)-(s.y-.12));
 let accel=0;
 if(input.up)accel=s.speed<-.3?8:5.2*Math.max(.12,1-Math.max(0,s.speed)/15);
 if(input.down)accel=s.speed>.3?-10:-3.6*Math.max(.12,1+Math.min(0,s.speed)/5);
 accel*=1/(1+depth*1.6);
 accel-=clamp((front-rear)/3.4,-.8,.8)*4.5;
 if(input.brake){const delta=14*dt;s.speed=Math.abs(s.speed)<delta?0:s.speed-Math.sign(s.speed)*delta;accel=0;}
 else if(!input.up&&!input.down&&Math.abs(s.speed)<.15&&Math.abs(front-rear)<.8){s.speed=0;accel=0;}
 s.speed=clamp(s.speed+accel*dt,-5.5,15.5);s.speed*=Math.exp(-(terrain.resistance+.012*Math.abs(s.speed)+Math.min(2.2,depth*.85))*dt);
 const yaw=s.speed*Math.tan(s.steer)/3.3*terrain.grip/(1+depth*.18);s.heading+=yaw*dt;
 const oldX=s.x,oldZ=s.z;const previous=Number.isFinite(s.motionHeading)?s.motionHeading:s.heading;s.motionHeading=previous+Math.atan2(Math.sin(s.heading-previous),Math.cos(s.heading-previous))*(1-Math.exp(-dt*(12*terrain.grip)/(1+depth*.4)));s.x+=Math.sin(s.motionHeading)*s.speed*dt;s.z+=Math.cos(s.motionHeading)*s.speed*dt;
 for(const o of (typeof obstacles==='function'?obstacles(s.x,s.z):obstacles)){const dx=s.x-o.x,dz=s.z-o.z,rx=(o.rx||o.r)+1.25,rz=(o.rz||o.r)+1.25,d=Math.hypot(dx/rx,dz/rz);if(d<1){s.x=o.x+(d>1e-6?dx/d:rx);s.z=o.z+(d>1e-6?dz/d:0);s.speed*=.3;}}
 const boundary=4000;if(Math.abs(s.x)>boundary||s.z<-2000||s.z>6000){s.x=oldX;s.z=oldZ;s.speed*=-.15;}
 s.wheels=contacts(s,height);for(const wheel of s.wheels)wheel.waterDepth=height.surface?height.surface(wheel.x,wheel.z).depth:0;const w=s.wheels,mean=w.reduce((a,v)=>a+v.y,0)/4;
 s.vy+=(52*(mean+.38+Math.min(.22,depth*.12)-s.y)-11*s.vy)*dt;s.y+=s.vy*dt;
 // Limit bottom-out while allowing travel and damped rebound over rough ground.
 const floor=Math.max(...w.map(v=>v.y))-.01;if(s.y<floor){s.y=floor;s.vy=Math.max(0,s.vy);}
 spring(s,'pitch',clamp(Math.atan2((w[0].y+w[1].y-w[2].y-w[3].y)/2,3.3)-accel*.007,-.55,.55),dt,48,10);
 spring(s,'roll',clamp(Math.atan2((w[1].y+w[3].y-w[0].y-w[2].y)/2,2)-yaw*s.speed*.012,-.5,.5),dt,55,11);
 limitTravel(s);s.travel+=Math.abs(s.speed)*dt;s.wheelSpin+=s.speed*dt/.48;
 return s;
}
const api={spawn,step,clamp};if(typeof module!=='undefined')module.exports=api;root.AmberPhysics=api;
})(typeof window==='undefined'?globalThis:window);
