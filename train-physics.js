/* Summit Run: deterministic downhill runner, independent of the existing driving games. */
(function(root){
 'use strict';
 const SPACING=7.5,LENGTH=180,GAP_START=105,GAP_END=125,LAUNCH=101,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function hash(n,seed){let x=(n^seed)>>>0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;}
 function section(index,seed=1){
  const patterns=[7,5,2,3,6,7],mask=patterns[((index%patterns.length)+patterns.length)%patterns.length];
  return {index,start:index*LENGTH,gapStart:index*LENGTH+GAP_START,gapEnd:index*LENGTH+GAP_END,launch:index*LENGTH+LAUNCH,mask,rock:index>0&&mask===7?{z:index*LENGTH+154,lane:[0,1,2].filter(l=>mask&(1<<l))[hash(index,seed)%[0,1,2].filter(l=>mask&(1<<l)).length]}:null};
 }
 function laneX(lane){return(lane-1)*SPACING;}
 function rail(z,lane,seed=1){const seg=section(Math.floor(z/LENGTH),seed),p=z-seg.start;return lane>=0&&lane<=2&&!(p>=GAP_START&&p<GAP_END)&&(p<GAP_END||!!(seg.mask&(1<<lane)));}
 function ground(z){const p=((z%LENGTH)+LENGTH)%LENGTH;return p>=93&&p<LAUNCH?(p-93)/(LAUNCH-93):0;}
 function create(seed=1){return{seed:seed>>>0,phase:'running',time:0,z:0,x:0,lane:1,target:1,speed:23,y:0,vy:0,vx:0,airborne:false,takeoffLane:1,jumps:0,landings:0,transfers:0,bonus:0,score:0,fallTime:0,reason:'',lastLanding:0,history:[]};}
 function jump(s){if(s.phase!=='running'||s.airborne)return false;s.airborne=true;s.vy=10;s.takeoffLane=s.lane;s.y=ground(s.z);s.jumps++;return true;}
 function turn(s,direction){if(s.phase!=='running'||!s.airborne||![-1,1].includes(direction))return false;s.target=clamp(s.target+direction,0,2);return true;}
 function fail(s,reason){if(s.phase!=='running')return;s.phase='falling';s.reason=reason;s.fallTime=0;s.vy=Math.min(s.vy,0);}
 function limits(time){const pace=Math.min(26,time*.085);return{min:18+pace*.55,coast:26+pace,max:38+pace};}
 function warning(s){
  const seg=section(Math.floor((s.z+4)/LENGTH),s.seed),rock=seg.rock;
  if(rock&&rock.lane===s.lane&&rock.z>s.z&&rock.z-s.z<75)return{kind:'rock',distance:rock.z-s.z,text:'Rock on the rails · jump or change track'};
  if(seg.gapStart>s.z&&seg.gapStart-s.z<90){const safe=!!(seg.mask&(1<<s.target));const right=s.target<2&&!!(seg.mask&(1<<(s.target+1)));return{kind:'gap',distance:seg.gapStart-s.z,mask:seg.mask,text:safe?'Ramp ahead · stay on track':`Track ends · jump ${right?'right':'left'}`};}
  if(s.airborne)return{kind:'air',text:'Airborne · ← / → to choose your landing'};
  return{kind:'clear',text:'Keep rolling. There’s a long way down.'};
 }
 function step(s,input={},dt=1/120){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1/30);
  if(s.phase==='finished')return;
  if(s.phase==='falling'){s.fallTime+=dt;s.vy-=18*dt;s.y+=s.vy*dt;s.z+=s.speed*dt*.35;if(s.fallTime>=1)s.phase='finished';return;}
  s.time+=dt;const speed=limits(s.time),target=input.brake?speed.min:input.throttle?speed.max:speed.coast;
  s.speed+=clamp(target-s.speed,-12*dt,7*dt);s.speed=Math.max(1,s.speed);
  const oldZ=s.z;s.z+=s.speed*dt;
  const seg=section(Math.floor(s.z/LENGTH),s.seed);
  if(!s.airborne&&oldZ<seg.launch&&s.z>=seg.launch){s.y=1;jump(s);s.y=1;}
  if(s.airborne){const oldX=s.x;s.x+=clamp(laneX(s.target)-s.x,-17*dt,17*dt);s.vx=(s.x-oldX)/dt;s.vy-=12*dt;s.y+=s.vy*dt;
   if(s.y<=0){s.y=0;const nearest=clamp(Math.round(s.x/SPACING)+1,0,2);
    if(Math.abs(s.x-laneX(nearest))>1.15||!rail(s.z,nearest,s.seed)){fail(s,'Missed the landing. Aim for an open track.');return;}
    s.lane=nearest;s.target=nearest;s.x=laneX(nearest);s.vx=0;s.airborne=false;s.lastLanding=s.time;s.landings++;s.bonus+=25;
    if(nearest!==s.takeoffLane){s.transfers++;s.bonus+=35;}
   }
  }else{s.y=ground(s.z);s.vx=0;if(!rail(s.z,s.lane,s.seed)){fail(s,'The track ran out. Use a ramp to reach another ridge.');return;}}
  for(let i=Math.floor(oldZ/LENGTH);i<=Math.floor(s.z/LENGTH);i++){const rock=section(i,s.seed).rock;if(rock&&oldZ<rock.z+1.5&&s.z>=rock.z-1.5&&Math.abs(s.x-laneX(rock.lane))<1.8&&s.y<1.7){fail(s,'Rock on the rails. Jump sooner or take another track.');return;}}
  s.score=Math.floor(s.z)+s.bonus;
  s.history.push({z:s.z,x:s.x,y:s.y,vx:s.vx});while(s.history.length>360)s.history.shift();
 }
 function trailer(s,offset){const z=s.z-offset,history=s.history;for(let i=history.length-1;i>=0;i--)if(history[i].z<=z)return history[i];return{z,x:0,y:0,vx:0};}
 const api={SPACING,LENGTH,GAP_START,GAP_END,LAUNCH,section,laneX,rail,ground,create,jump,turn,step,limits,warning,trailer};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SummitPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
