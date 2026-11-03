/* Server positions remain authoritative; rendering never jumps to a delayed packet.
   Predict packet age, discard old states and reconcile in fixed simulation steps. */
(function(root){
'use strict';
function create(P,height,obstacles){
 let target=null,latest=-Infinity;
 const clamp=P.clamp,angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
 return {
  clear(){target=null;latest=-Infinity;},
  accept(packet,age=0){
   if(!packet||!Number.isFinite(packet.updated)||packet.updated<=latest||![packet.car?.x,packet.car?.z,packet.car?.heading].every(Number.isFinite))return false;
   latest=packet.updated;target=structuredClone(packet.car);
   let remaining=clamp(age,0,.5);
   while(remaining>1e-6){const dt=Math.min(1/120,remaining);P.step(target,packet.input||{},dt,height,obstacles);remaining-=dt;}
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
   P.step(target,input,dt,height,obstacles);
  }
 };
}
if(typeof module!=='undefined')module.exports=create;else root.HillNetwork=create;
})(typeof window==='undefined'?globalThis:window);
