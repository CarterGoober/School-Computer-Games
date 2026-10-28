/* Sunday Slide: original drift, jump and obstacle simulation. */
(function(root){
'use strict';
const R=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.Racer;
const {nearest,clamp,formatTime}=R;
const vehicles=[
 {id:'coupe',name:'Sunset Coupe',kind:'car',color:['#cb7340','#b76036','#edaa69'],accel:16,max:46,grip:5.3,turn:.058,mass:1},
 {id:'truck',name:'Trail Pickup',kind:'truck',color:['#729b8b','#547a70','#9bbba3'],accel:13,max:39,grip:4.3,turn:.052,mass:1.4},
 {id:'train',name:'Little Locomotive',kind:'train',color:['#b34d3f','#823d35','#d57958'],accel:10,max:33,grip:3.4,turn:.046,mass:2},
 {id:'sf90',name:'Ferrari SF90 · tribute',kind:'supercar',color:['#c43832','#982e29','#ee5d43'],accel:22,max:58,grip:6,turn:.06,mass:.9}
];
const definitions=[
 {name:'Golden Meadows',width:14,theme:'meadow',points:[[0,0,0],[0,0,90],[55,0,145],[140,0,135],[180,0,65],[140,0,-20],[45,0,-45]],jumps:[.11],obstacles:[.31,.65]},
 {name:'Canyon Postcards',width:13,theme:'desert',points:[[0,0,0],[0,0,100],[55,0,155],[110,0,130],[90,0,75],[155,0,45],[175,0,-25],[90,0,-65],[20,0,-50]],jumps:[.09,.56],obstacles:[.29,.73]},
 {name:'Pine & Switchback',width:13,theme:'alpine',points:[[0,0,0],[0,3,85],[45,6,125],[90,8,90],[55,5,45],[120,4,5],[150,0,-55],[60,0,-85],[10,0,-45]],jumps:[],obstacles:[.25,.49,.72]},
 {name:'Lakeside Leisure',width:15,theme:'meadow',points:[[0,0,0],[0,0,100],[70,0,170],[165,0,125],[200,0,45],[145,0,-35],[65,0,-65]],jumps:[.12,.61],obstacles:[.36,.78]},
 {name:'The Long Way Home',width:14,theme:'alpine',points:[[0,0,0],[0,3,110],[65,8,170],[150,12,150],[200,8,85],[155,3,20],[205,0,-45],[120,0,-110],[35,0,-85]],jumps:[.08,.41,.72],obstacles:[.23,.56,.85]}
];
const base=R.definitions.length;R.definitions.push(...definitions);
function createTrack(id){const track=R.createTrack(base+id);track.id=id;track.ramps=definitions[id].jumps.map(f=>{const end=Math.floor(track.samples.length*f),start=end-5;return{start,end,height:3.3}});for(const ramp of track.ramps)for(let i=ramp.start;i<=ramp.end;i++)track.samples[i].y+=ramp.height*(i-ramp.start)/(ramp.end-ramp.start);track.obstacles=definitions[id].obstacles.map((f,i)=>{const p=track.samples[Math.floor(track.samples.length*f)],offset=(i%2?1:-1)*track.width*.29;return{x:p.x+p.nx*offset,z:p.z+p.nz*offset,y:p.y,radius:1.4,kind:i%2?'log':'hay',heading:Math.atan2(p.dx,p.dz)}});return track}
function spawn(track,vehicleId=0){const car=R.spawn(track);Object.assign(car,{vehicleId,vx:0,vz:0,driftScore:0,combo:1,driftAngle:0,airborne:false,airtime:0,totalAir:0,jumps:0,collisionCooldown:0,cinematicTime:0,wagons:[]});for(let i=0;i<2;i++)car.wagons.push({x:car.x-Math.sin(car.heading)*(i+1)*4.5,z:car.z-Math.cos(car.heading)*(i+1)*4.5,heading:car.heading});return car}
function recover(car,track){R.recover(car,track);Object.assign(car,{vx:0,vz:0,airborne:false,airtime:0,combo:1,driftAngle:0,cinematicTime:0});car.wagons=spawn(track,car.vehicleId).wagons.map((w,i)=>({x:car.x-Math.sin(car.heading)*(i+1)*4.5,z:car.z-Math.cos(car.heading)*(i+1)*4.5,heading:car.heading}))}
function step(car,track,input,dt){dt=clamp(dt,0,1/30);if(car.finished)return null;const v=vehicles[car.vehicleId];car.time+=dt;car.collisionCooldown=Math.max(0,car.collisionCooldown-dt);let surface=nearest(track,car.x,car.z),previous=surface;const forward=()=>car.vx*Math.sin(car.heading)+car.vz*Math.cos(car.heading);car.offroad=surface.distance>track.width/2;const grounded=!car.airborne;
 const turn=(input.right?1:0)-(input.left?1:0);car.steer+=(turn-car.steer)*Math.min(1,dt*7);
 if(grounded){const f=forward(),speed=Math.hypot(car.vx,car.vz);car.heading+=car.steer*clamp(f,-12,33)*v.turn*dt*(input.brake?1.32:1);const s=Math.sin(car.heading),c=Math.cos(car.heading);let longitudinal=car.vx*s+car.vz*c,lateral=car.vx*c-car.vz*s;
  const throttle=(input.up?1:0)-(input.down?1:0);longitudinal+=throttle*v.accel*dt;if(input.down&&longitudinal>0)longitudinal-=23*dt;longitudinal*=Math.exp(-(car.offroad?1.65:.18)*dt);if(input.brake)longitudinal*=Math.exp(-.65*dt);longitudinal=clamp(longitudinal,-8,car.offroad?20:v.max);lateral*=Math.exp(-(car.offroad?2.4:input.brake?.75:v.grip)*dt);car.vx=s*longitudinal+c*lateral;car.vz=c*longitudinal-s*lateral;
  car.driftAngle=Math.abs(Math.atan2(lateral,Math.max(1,Math.abs(longitudinal))));if(speed>7&&car.driftAngle>.12&&!car.offroad){car.combo=clamp(car.combo+dt*.18,1,5);car.driftScore+=car.driftAngle*speed*dt*car.combo*15}else car.combo=Math.max(1,car.combo-dt*.7);
 }else{car.heading+=car.steer*dt*.22;car.airtime+=dt;car.totalAir+=dt;car.cinematicTime+=dt;car.vy-=18*dt;car.y+=car.vy*dt;}
 car.x+=car.vx*dt;car.z+=car.vz*dt;car.speed=forward();surface=nearest(track,car.x,car.z);let event=null;
 for(const ramp of track.ramps)if(!car.airborne&&previous.index<=ramp.end&&surface.index>ramp.end&&previous.index>=ramp.start&&surface.distance<track.width/2&&car.speed>12){car.airborne=true;car.y=Math.max(car.y,track.samples[ramp.end].y+.42);car.vy=6.5+Math.abs(car.speed)*.1;car.airtime=0;car.cinematicTime=0;car.jumps++;event='jump'}
 if(car.airborne){if(car.y<=surface.y+.42&&car.vy<0){car.y=surface.y+.42;car.airborne=false;car.vy=0;car.driftScore+=Math.floor(car.airtime*200);event='landing'}}else car.y=surface.y+.42;
 if(!car.airborne&&car.collisionCooldown===0)for(const o of track.obstacles)if(Math.hypot(car.x-o.x,car.z-o.z)<o.radius+1){let dx=car.x-o.x,dz=car.z-o.z,len=Math.hypot(dx,dz)||1;car.x=o.x+dx/len*(o.radius+1.15);car.z=o.z+dz/len*(o.radius+1.15);car.vx*= -.2;car.vz*= -.2;car.combo=1;car.collisionCooldown=1.5;car.time+=1;event='collision';break}
 if(surface.distance>55){recover(car,track);return'recovered'}
 const goal=track.checkpoints[car.nextCheckpoint];if(goal!==undefined){const p=track.samples[goal];if(Math.hypot(car.x-p.x,car.z-p.z)<track.width*1.05&&surface.distance<track.width*.65){car.nextCheckpoint++;car.recoveryIndex=goal;if(!event)event='checkpoint'}}
 if(car.nextCheckpoint===4&&car.lastProgress>.93&&surface.progress<.07&&surface.distance<track.width*.6&&car.speed>0){car.finished=true;event='finish'}car.lastProgress=surface.progress;
 let parent=car;for(const w of car.wagons){const dx=parent.x-w.x,dz=parent.z-w.z,len=Math.hypot(dx,dz)||1;w.x=parent.x-dx/len*4.2;w.z=parent.z-dz/len*4.2;w.heading=Math.atan2(dx,dz);parent=w}
 return event;
}
const api={...R,createTrack,spawn,step,recover,vehicles,definitions};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Drift=api;
})(typeof window!=='undefined'?window:globalThis);
