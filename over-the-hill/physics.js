/* Shared SI rigid-body vehicle simulation. Gravity is never replaced by a height clamp. */
(function(root){
'use strict';
const C=root.HillRigid||(typeof require==='function'?require('./rigid-engine.js'):null);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),GRAVITY=9.81,COM=.25,TILE=16;
const GEARS={
 '-1':{force:2600,redline:6,min:0},1:{force:3900,redline:4.6,min:0},
 2:{force:3400,redline:7.3,min:0},3:{force:3000,redline:10.5,min:0},
 4:{force:2500,redline:14.5,min:0},5:{force:2250,redline:25,min:5},6:{force:1950,redline:39,min:8}
};
function shiftReason(s,gear){
 if(!Number.isInteger(gear)||!GEARS[gear])return 'Choose a gear from 1–6 or reverse.';
 if((gear===-1)!==(s.gear===-1)&&Math.abs(s.speed||0)>1.2)return 'Slow below 3 mph before changing direction.';
 if(gear>0&&Math.abs(s.speed||0)>GEARS[gear].redline*1.07)return 'Brake before downshifting into '+gear+'.';
 return null;
}
function shift(s,gear){if(shiftReason(s,gear))return false;const changed=s.gear!==gear;s.gear=gear;s.manual=true;if(changed)s.shiftTime=.18;return true;}
const contexts=new WeakMap(),namedContexts=new Map(),tiles=new WeakMap();
function terrainShape(height,cx,cz){let cache=tiles.get(height);if(!cache){cache=new Map();tiles.set(height,cache);}const key=cx+','+cz;if(!cache.has(key)){const data=[];for(let x=0;x<=8;x++){const row=[];for(let z=0;z<=8;z++)row.push(height(cx*TILE+x*2,cz*TILE+TILE-z*2));data.push(row);}cache.set(key,new C.Heightfield(data,{elementSize:2}));while(cache.size>512)cache.delete(cache.keys().next().value);}return cache.get(key);}
function serialize(s,ctx){const {body,vehicle}=ctx,q=body.quaternion,v=body.velocity,omega=body.angularVelocity,forward=q.vmult(new C.Vec3(0,0,1)),right=q.vmult(new C.Vec3(1,0,0));const offset=q.vmult(new C.Vec3(0,COM,0));s.x=body.position.x-offset.x;s.y=body.position.y-offset.y;s.z=body.position.z-offset.z;s.q=[q.x,q.y,q.z,q.w];s.vx=v.x;s.vy=v.y;s.vz=v.z;s.angular=[omega.x,omega.y,omega.z];s.heading=Math.atan2(forward.x,forward.z);s.motionHeading=Math.atan2(v.x,v.z);s.pitch=Math.atan2(forward.y,Math.hypot(forward.x,forward.z));s.roll=Math.atan2(right.y,Math.hypot(right.x,right.z));s.speed=v.dot(new C.Vec3(Math.sin(s.heading),0,Math.cos(s.heading)));s.airborne=vehicle.wheelInfos.every(w=>!w.isInContact);s.wheels=vehicle.wheelInfos.map((w,i)=>{const contact=w.isInContact,ground=contact?w.raycastResult.hitPointWorld.y+.48:null;vehicle.updateWheelTransform(i);w.isInContact=contact;const p=w.worldTransform.position,q=w.worldTransform.quaternion;return{q:[q.x,q.y,q.z,q.w],x:p.x,y:p.y,z:p.z,lx:i%2?1:-1,lz:i<2?1.65:-1.65,groundY:ground,contact,contactPoint:contact?[w.raycastResult.hitPointWorld.x,w.raycastResult.hitPointWorld.y,w.raycastResult.hitPointWorld.z]:null,contactNormal:contact?[w.raycastResult.hitNormalWorld.x,w.raycastResult.hitNormalWorld.y,w.raycastResult.hitNormalWorld.z]:null,suspensionLength:w.suspensionLength,rotation:w.rotation,deltaRotation:w.deltaRotation,steer:w.steering,waterDepth:ctx.height.surface?ctx.height.surface(p.x,p.z).depth:0};});s.wheelSpin=s.wheels.reduce((a,w)=>a+w.rotation,0)/4;return s;}
function spawn(height,x=0,z=0,heading=0){const sn=Math.sin(heading),cs=Math.cos(heading),pts=[[-1,1.65],[1,1.65],[-1,-1.65],[1,-1.65]],h=pts.map(([a,b])=>height(x+a*cs+b*sn,z+b*cs-a*sn)),pitch=Math.atan2((h[0]+h[1]-h[2]-h[3])/2,3.3),roll=Math.atan2((h[1]+h[3]-h[0]-h[2])/2,2),q=new C.Quaternion();q.setFromEuler(-pitch,heading,roll,'YXZ');return{x,z,y:Math.max(height(x,z),h.reduce((a,v)=>a+v,0)/4)+1.0,heading,motionHeading:heading,pitch,roll,q:[q.x,q.y,q.z,q.w],vx:0,vy:0,vz:0,angular:[0,0,0],speed:0,gear:1,manual:false,rpm:850,shiftTime:0,airborne:true,steer:0,travel:0,wheelSpin:0,wheels:pts.map(([a,b],i)=>({x:x+a*cs+b*sn,y:h[i]+.48,z:z+b*cs-a*sn,lx:a,lz:b,contact:false,groundY:h[i]+.48,rotation:0,suspensionLength:.43}))};}
// Sort and terminate on the same AABB bounds. cannon-es SAP's sphere-bound
// early-out can skip overlapping cars among long heightfield/scenery shapes.
class TerrainBroadphase extends C.SAPBroadphase {
 constructor(world){super(world);this.useBoundingBoxes=true;}
 collisionPairs(world,pairsA,pairsB){
  if(this.dirty){this.sortList();this.dirty=false;}
  const axis=['x','y','z'][this.axisIndex],list=this.axisList;
  for(let i=0;i<list.length;i++){const a=list[i];for(let j=i+1;j<list.length;j++){
   const b=list[j];if(b.aabb.lowerBound[axis]>a.aabb.upperBound[axis])break;
   if(this.needBroadphaseCollision(a,b))this.intersectionTest(a,b,pairsA,pairsB);
  }}
 }
}
function makeWorld(bounds={minX:-4000,maxX:4000,minZ:-2000,maxZ:6000}){const world=new C.World({gravity:new C.Vec3(0,-GRAVITY,0),allowSleep:false});world.staticMaterial=new C.Material({friction:1,restitution:1});world.solver.iterations=12;world.solver.tolerance=.001;world.broadphase=new TerrainBroadphase(world);world.defaultContactMaterial.friction=.55;world.defaultContactMaterial.restitution=.08;world.defaultContactMaterial.contactEquationStiffness=1e7;world.defaultContactMaterial.contactEquationRelaxation=4;
 const midX=(bounds.minX+bounds.maxX)/2,midZ=(bounds.minZ+bounds.maxZ)/2,halfX=(bounds.maxX-bounds.minX)/2+1,halfZ=(bounds.maxZ-bounds.minZ)/2+1;for(const [x,z,hx,hz]of [[bounds.minX-1,midZ,1,halfZ],[bounds.maxX+1,midZ,1,halfZ],[midX,bounds.minZ-1,halfX,1],[midX,bounds.maxZ+1,halfX,1]]){const wall=new C.Body({mass:0,material:world.staticMaterial,shape:new C.Box(new C.Vec3(hx,2500,hz))});wall.position.set(x,1000,z);wall.aabbNeedsUpdate=true;world.addBody(wall);}return world;}
function context(s,height,shared=null){let ctx=shared?shared.vehicles.get(s.physicsKey):s.physicsKey?namedContexts.get(s.physicsKey):contexts.get(s);if(ctx&&ctx.height===height)return ctx;const world=shared?shared.world:makeWorld(height.bounds);
 const body=new C.Body({mass:1500,material:new C.Material({friction:.55,restitution:.08}),linearDamping:.005,angularDamping:.12});body.addShape(new C.Box(new C.Vec3(.86,.6,2.0)),new C.Vec3(0,.2,0));body.addShape(new C.Box(new C.Vec3(.94,.4,1.35)),new C.Vec3(0,1.15,-.65));
 // Small compressed-tyre envelopes provide real bump-stop contact when a spring bottoms out.
 const axleRotation=new C.Quaternion();axleRotation.setFromAxisAngle(new C.Vec3(0,0,1),Math.PI/2);
 for(let i=0;i<4;i++)body.addShape(new C.Cylinder(.44,.44,.28,12),new C.Vec3(i%2?1:-1,-.41,i<2?1.65:-1.65),axleRotation);
 const vehicle=new C.RaycastVehicle({chassisBody:body,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});for(let i=0;i<4;i++)vehicle.addWheel({radius:.48,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(-1,0,0),chassisConnectionPointLocal:new C.Vec3(i%2?1:-1,-.20,i<2?1.65:-1.65),suspensionRestLength:.43,maxSuspensionTravel:.22,suspensionStiffness:40,dampingRelaxation:4.6,dampingCompression:5.2,maxSuspensionForce:16000,frictionSlip:1.8,rollInfluence:.3,customSlidingRotationalSpeed:-20,useCustomSlidingRotationalSpeed:true});vehicle.addToWorld(world);

 ctx={world,body,vehicle,height,terrain:shared?shared.terrain:new Map(),scenery:shared?shared.scenery:new Map(),cell:'',shared};if(shared){shared.vehicles.set(s.physicsKey,ctx);return ctx;}contexts.set(s,ctx);if(s.physicsKey){namedContexts.set(s.physicsKey,ctx);while(namedContexts.size>64)namedContexts.delete(namedContexts.keys().next().value);}return ctx;}
function staticScene(ctx,s,obstacles){const {world,height}=ctx,cx=Math.floor(s.x/TILE),cz=Math.floor(s.z/TILE),key=cx+','+cz;if(key===ctx.cell)return;ctx.cell=key;const wanted=new Set();for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++){const key=x+','+z;wanted.add(key);if(!ctx.terrain.has(key)){const b=new C.Body({mass:0,material:world.staticMaterial,shape:terrainShape(height,x,z)});b.position.set(x*TILE,0,z*TILE+TILE);b.quaternion.setFromAxisAngle(new C.Vec3(1,0,0),-Math.PI/2);world.addBody(b);b.aabb.lowerBound.set(x*TILE,b.shapes[0].minValue,z*TILE);b.aabb.upperBound.set((x+1)*TILE,b.shapes[0].maxValue,(z+1)*TILE);b.aabbNeedsUpdate=false;ctx.terrain.set(key,b);}}for(const [key,b]of ctx.terrain)if(!ctx.shared&&!wanted.has(key)){world.removeBody(b);ctx.terrain.delete(key);}
 const near=typeof obstacles==='function'?obstacles(s.x,s.z):obstacles,wantedObjects=new Set();for(const o of near){if(Math.hypot(o.x-s.x,o.z-s.z)>115+(o.r||0))continue;const key=o.x+','+o.z;wantedObjects.add(key);if(ctx.scenery.has(key))continue;const tree=o.kind==='tree',heightOf=o.h|| (o.kind==='rock'?(o.r||1)*.86:6),shape=tree?new C.Cylinder(o.r||.5,o.r||.5,heightOf,8):o.kind==='rock'?new C.Cylinder(o.r*.7,o.r*.85,heightOf,8):new C.Box(new C.Vec3(o.rx||o.r||2,heightOf/2,o.rz||o.r||2)),b=new C.Body({mass:0,material:world.staticMaterial,shape});b.position.set(o.x,height(o.x,o.z)+heightOf/2+(o.yOffset||0),o.z);if(o.heading)b.quaternion.setFromAxisAngle(new C.Vec3(0,1,0),o.heading);if(o.kind==='log'){b.shapes=[];b.shapeOffsets=[];b.shapeOrientations=[];b.addShape(new C.Cylinder(.13,.13,o.length,8));b.quaternion.setFromEuler(Math.PI/2,o.heading,0,'YXZ');b.updateBoundingRadius();b.aabbNeedsUpdate=true;}b.aabbNeedsUpdate=true;world.addBody(b);ctx.scenery.set(key,b);}for(const [key,b]of ctx.scenery)if(!ctx.shared&&!wantedObjects.has(key)){world.removeBody(b);ctx.scenery.delete(key);}}
function loadBody(ctx,s){const {body}=ctx;if(s.q)body.quaternion.set(...s.q);const offset=body.quaternion.vmult(new C.Vec3(0,COM,0));body.position.set(s.x+offset.x,s.y+offset.y,s.z+offset.z);body.velocity.set(s.vx||0,s.vy||0,s.vz||0);if(s.angular)body.angularVelocity.set(...s.angular);body.aabbNeedsUpdate=true;body.updateInertiaWorld();
}
function configure(ctx,s,input,dt){const {body,vehicle,world,height}=ctx; const direction=(input.left?-1:0)+(input.right?1:0),speed=Math.hypot(body.velocity.x,body.velocity.z);s.steer+=(direction*Math.min(.52/(1+speed*.07),Math.atan(6.5*3.3/(speed*speed+1)))-s.steer)*(1-Math.exp(-7*dt));const sf=height.surface?height.surface(s.x,s.z):{depth:0,grip:1,resistance:.17};body.material.friction=.55*(sf.grip??1);s.waterDepth=sf.depth;s.chassisWaterDepth=Math.max(0,(sf.level??-1e4)-(s.y-.15));
 if(GEARS[input.gear])shift(s,input.gear);
 s.shiftTime=Math.max(0,(s.shiftTime||0)-dt);
 const manual=s.manual===true,gear=GEARS[s.gear]||GEARS[1],forward=s.gear!==-1;
 if(!manual)s.gear=s.speed<-.5?-1:4; // Cached clients retain their earlier controls during rollout.
 const targetRPM=s.airborne&&input.up?4500:Math.max(850,Math.abs(s.speed)/(manual?gear.redline:14.5)*4500);
 s.rpm=(s.rpm||850)+(clamp(targetRPM,850,5200)-(s.rpm||850))*(1-Math.exp(-9*dt));
 for(let i=0;i<4;i++){
  vehicle.updateWheelTransform(i);
  const wheel=vehicle.wheelInfos[i],p=wheel.worldTransform.position,ground=height.surface?height.surface(p.x,p.z):sf,grip=ground.grip??1,depth=ground.depth||0;
  wheel.frictionSlip=1.8*grip/(1+depth*.25);
  vehicle.setSteeringValue(i<2?Math.atan(3.3*Math.tan(s.steer)/(3.3-(i%2?1:-1)*Math.tan(s.steer))):0,i);
  let force=0,service=input.brake||manual&&input.down;
  if(manual){
   const signed=(forward?1:-1)*s.speed,lug=gear.min?.18+.82*clamp(Math.abs(s.speed)/gear.min,0,1):1;
   const climb=forward?s.pitch:-s.pitch,lowRange=1+clamp((climb-.12)*1.8,0,.65)*clamp(1-Math.abs(s.speed)/5,0,1)*(Math.abs(s.gear)<=2?1:Math.abs(s.gear)===3?.4:0);
   if(input.up&&s.shiftTime===0)force=(forward?-1:1)*gear.force*Math.max(0,1-Math.max(0,signed)/gear.redline)*lug*lowRange;
   // Engine braking is a bounded wheel force, never a speed/pose clamp.
   if(signed>gear.redline)force+=(forward?1:-1)*Math.min(650,(signed-gear.redline)*180);
   else if(!input.up&&Math.abs(s.speed)>.4)force+=Math.sign(s.speed)*Math.min(180,60+Math.abs(s.speed)*8);
  }else{
   if(input.up)force=s.speed<-.5?0:-2500*Math.max(.05,1-Math.max(0,s.speed)/14.5);
   if(input.down)force=s.speed>.5?0:1800*Math.max(.05,1+Math.min(0,s.speed)/6);
   force*=1+clamp(((input.down?-s.pitch:s.pitch)-.15)*2,0,1)*clamp(1-Math.abs(s.speed)/5,0,1);
   service=service||input.up&&s.speed<-.5||input.down&&s.speed>.5;
  }
  vehicle.applyEngineForce(force/(1+depth*1.6),i);
  vehicle.setBrake((input.parking&&i>=2)||service?20:input.up||!manual&&input.down?0:2.2,i);
  if(s.wheels?.[i]){wheel.rotation=s.wheels[i].rotation||0;wheel.deltaRotation=s.wheels[i].deltaRotation||0;}
 }
 // Drag and bounded displacement forces act on the body; none set its position.
 function environmentForces(){if(sf.depth>0){const drag=clamp(sf.depth*.9,0,2.5);body.applyForce(new C.Vec3(-body.velocity.x*1500*drag,-body.velocity.y*500*drag,-body.velocity.z*1500*drag));const immersion=clamp(s.chassisWaterDepth/1.6,0,1);body.applyForce(new C.Vec3(0,1500*GRAVITY*.65*immersion,0));}
 if(!s.airborne){const rolling=(sf.resistance??.17)*1500;body.applyForce(new C.Vec3(-body.velocity.x*rolling,0,-body.velocity.z*rolling));}
 }return environmentForces;
}
function step(s,input,dt,height,obstacles=[]){dt=clamp(dt,0,1/30);if(!dt)return s;const ctx=context(s,height);staticScene(ctx,s,obstacles);loadBody(ctx,s);s.physicsAccumulator=(s.physicsAccumulator||0)+dt;while(s.physicsAccumulator>=1/120-1e-10){configure(ctx,s,input,1/120)();ctx.world.step(1/120);s.physicsAccumulator=Math.max(0,s.physicsAccumulator-1/120);serialize(s,ctx);}s.travel+=Math.hypot(s.vx,s.vz)*dt;return s;}
function createShared(height,obstacles=[]){return{world:makeWorld(height.bounds),height,obstacles,terrain:new Map(),scenery:new Map(),vehicles:new Map(),accumulator:0};}
function anchor(ctx,end){return ctx.body.pointToWorldFrame(new C.Vec3(0,-.1,end==='front'?2.25:-2.25));}
function stepShared(scene,entries,dt,cables=[]){const active=new Set(entries.map(e=>e.id));for(const [id,ctx]of scene.vehicles)if(!active.has(id)){ctx.vehicle.removeFromWorld(scene.world);scene.vehicles.delete(id);}
 for(const e of entries){e.car.physicsKey=e.id;const ctx=context(e.car,scene.height,scene);staticScene(ctx,e.car,scene.obstacles);loadBody(ctx,e.car);}
 scene.accumulator+=dt;while(scene.accumulator>=1/120-1e-10){for(const e of entries)configure(scene.vehicles.get(e.id),e.car,e.input||{},1/120)();
  for(const cable of cables){const a=scene.vehicles.get(cable.a),b=scene.vehicles.get(cable.b);if(!a||!b)continue;const owner=entries.find(e=>e.id===cable.owner);cable.length=clamp(cable.length+(owner?.input?.winch||0)*1.5/120,2,25);const pa=anchor(a,cable.endA),pb=anchor(b,cable.endB),delta=pb.vsub(pa),distance=delta.length();if(distance<.01)continue;delta.scale(1/distance,delta);const va=a.body.getVelocityAtWorldPoint(pa,new C.Vec3()),vb=b.body.getVelocityAtWorldPoint(pb,new C.Vec3()),relative=vb.vsub(va).dot(delta);cable.tension=distance>cable.length?clamp((distance-cable.length)*9000+relative*1800,0,20000):0;const force=delta.scale(cable.tension);a.body.applyForce(force,pa.vsub(a.body.position));b.body.applyForce(force.negate(),pb.vsub(b.body.position));cable.distance=distance;cable.aPoint=[pa.x,pa.y,pa.z];cable.bPoint=[pb.x,pb.y,pb.z];}
  scene.world.step(1/120);for(const e of entries){serialize(e.car,scene.vehicles.get(e.id));e.car.travel+=Math.hypot(e.car.vx,e.car.vz)/120;}scene.accumulator=Math.max(0,scene.accumulator-1/120);}
 // Retain the union of collider neighborhoods, not duplicated shapes per car.
 for(const [key,body]of scene.terrain){const [x,z]=key.split(',').map(Number);if(!entries.some(e=>Math.abs(Math.floor(e.car.x/TILE)-x)<=1&&Math.abs(Math.floor(e.car.z/TILE)-z)<=1)){scene.world.removeBody(body);scene.terrain.delete(key);}}
 for(const [key,body]of scene.scenery)if(!entries.some(e=>Math.hypot(e.car.x-body.position.x,e.car.z-body.position.z)<145)){scene.world.removeBody(body);scene.scenery.delete(key);}
}
function prepare(s,height,obstacles=[]){const ctx=context(s,height);staticScene(ctx,s,obstacles);}
const api={spawn,step,prepare,createShared,stepShared,shift,shiftReason,GEARS,clamp,GRAVITY,toMPH:v=>Math.abs(v)*2.2369362920544};if(typeof module!=='undefined')module.exports=api;root.AmberPhysics=api;
})(typeof window==='undefined'?globalThis:window);
