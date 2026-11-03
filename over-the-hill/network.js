/* Server positions remain authoritative; rendering never jumps to a delayed packet.
   Predict packet age, discard old states and reconcile in fixed simulation steps. */
(function(root){
'use strict';
function create(P,height,obstacles,project=(s,input,dt)=>P.step(s,input,dt,height,obstacles)){
 let target=null,latest=-Infinity;
 const clamp=P.clamp,angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
 return {
  clear(){target=null;latest=-Infinity;},
  accept(packet,age=0){
   if(!packet||!Number.isFinite(packet.updated)||packet.updated<=latest||![packet.car?.x,packet.car?.z,packet.car?.heading].every(Number.isFinite))return false;
   latest=packet.updated;target=structuredClone(packet.car);
   let remaining=clamp(age,0,.5);
   while(remaining>1e-6){const dt=Math.min(1/120,remaining);project(target,packet.input||{},dt);remaining-=dt;}
   return true;
  },
  step(car,input,dt){
   if(!target)return;
   const dx=target.x-car.x,dz=target.z-car.z,gap=Math.hypot(dx,dz),f=1-Math.exp(-3*dt);
   const correction=Math.min(gap*f,2.5*dt),scale=gap>1e-8?correction/gap:0;
   car.x+=dx*scale;car.z+=dz*scale;
   if(car.q&&target.q){const C=root.HillRigid||(typeof require==='function'?require('./rigid-engine.js'):null),a=new C.Quaternion(...car.q),b=new C.Quaternion(...target.q),q=a.slerp(b,1-Math.exp(-2*dt));car.q=[q.x,q.y,q.z,q.w];}else for(const k of ['heading','motionHeading'])car[k]+=clamp(angle(target[k]-car[k])*f,-.5*dt,.5*dt);
   car.y+=clamp((target.y-car.y)*f,-2.5*dt,2.5*dt);for(const k of ['vx','vy','vz'])if(Number.isFinite(target[k]))car[k]+=clamp((target[k]-car[k])*f,-4*dt,4*dt);if(car.angular&&target.angular)car.angular=car.angular.map((v,i)=>v+(target.angular[i]-v)*f);
   car.speed+=clamp((target.speed-car.speed)*f,-3*dt,3*dt);
   // Height, wheel contact and suspension always come from the local ground solve.
   // Move the target with current controls between authoritative packets.
   project(target,input,dt);
  }
 };
}
if(typeof module!=='undefined')module.exports=create;else root.HillNetwork=create;
})(typeof window==='undefined'?globalThis:window);
/* Timestamped remote snapshots: adaptive delay, Hermite motion and quaternion interpolation. */
(function(root){'use strict';const API=typeof module!=='undefined'?module.exports:root.HillNetwork;
function qmix(a,b,t){const C=root.HillRigid||(typeof require==='function'?require('./rigid-engine.js'):null),q=new C.Quaternion(...a).slerp(new C.Quaternion(...b),t);q.normalize();return[q.x,q.y,q.z,q.w];}
function interpolate(a,b,t,seconds){const out=structuredClone(a),C=root.HillRigid||(typeof require==='function'?require('./rigid-engine.js'):null);for(const[k,v]of[['x','vx'],['y','vy'],['z','vz']]){const t2=t*t,t3=t2*t;out[k]=(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*(a[v]||0)*seconds+(-2*t3+3*t2)*b[k]+(t3-t2)*(b[v]||0)*seconds;out[v]=(a[v]||0)+((b[v]||0)-(a[v]||0))*t;}out.q=qmix(a.q,b.q,t);for(const key of ['speed','steer','wheelSpin','pitch','roll'])out[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*t;out.heading=a.heading+Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))*t;
 const inverseA=new C.Quaternion(...a.q).inverse(),inverseB=new C.Quaternion(...b.q).inverse(),q=new C.Quaternion(...out.q);out.wheels=a.wheels.map((w,i)=>{const other=b.wheels[i],la=inverseA.vmult(new C.Vec3(w.x-a.x,w.y-a.y,w.z-a.z)),lb=inverseB.vmult(new C.Vec3(other.x-b.x,other.y-b.y,other.z-b.z)),mixed=new C.Vec3();la.lerp(lb,t,mixed);const p=q.vmult(mixed);return{...w,x:out.x+p.x,y:out.y+p.y,z:out.z+p.z,q:w.q&&other.q?qmix(w.q,other.q,t):w.q,rotation:(w.rotation||0)+((other.rotation||0)-(w.rotation||0))*t,suspensionLength:(w.suspensionLength||.43)+((other.suspensionLength||.43)-(w.suspensionLength||.43))*t};});return out;}
class RemoteBuffer{
 constructor(){this.samples=[];this.interval=70;this.jitter=0;this.delay=110;this.lastArrival=0;this.generation=null;}
 add(car,time,arrival,generation=0){if(generation!==this.generation){this.samples=[];this.generation=generation;}if(this.samples.length&&time<=this.samples.at(-1).time)return;if(this.lastArrival){const gap=arrival-this.lastArrival;this.interval+=(gap-this.interval)*.12;this.jitter+=(Math.abs(gap-this.interval)-this.jitter)*.15;}this.lastArrival=arrival;this.delay=Math.max(80,Math.min(260,this.interval+this.jitter*2+30));this.samples.push({car:structuredClone(car),time});while(this.samples.length>40)this.samples.shift();}
 sample(serverNow){if(!this.samples.length)return null;const time=serverNow-this.delay;while(this.samples.length>2&&this.samples[1].time<time)this.samples.shift();const a=this.samples[0],b=this.samples[1];if(!b||time>=this.samples.at(-1).time){const latest=this.samples.at(-1),out=structuredClone(latest.car),dt=Math.max(0,Math.min(.1,(time-latest.time)/1000));for(const [key,velocity]of [['x','vx'],['y','vy'],['z','vz']])out[key]+=(out[velocity]||0)*dt;for(const w of out.wheels){w.x+=(out.vx||0)*dt;w.y+=(out.vy||0)*dt;w.z+=(out.vz||0)*dt;}return out;}const duration=b.time-a.time,t=Math.max(0,Math.min(1,(time-a.time)/duration));return interpolate(a.car,b.car,t,duration/1000);}
}
API.leadTicks=rtt=>Math.max(6,Math.min(36,Math.ceil(rtt*.06)+6));
API.RemoteBuffer=RemoteBuffer;API.interpolate=interpolate;
})(typeof window==='undefined'?globalThis:window);
